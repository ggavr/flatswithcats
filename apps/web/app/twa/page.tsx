'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@lib/api';
import { getTelegramInitData, isTelegramEnvironment, prepareTelegramWebApp } from '@lib/telegram';
import type { ListingDraftPayload, ListingsIndexItem, SaveProfilePayload } from '@lib/types';
import { ProfileForm, type ProfileFormValue } from '../../components/profile/ProfileForm';
import { ListingForm, type ListingFormValue } from '../../components/listing/ListingForm';
import { cardStyle, publishButtonStyle } from '../../components/ui/styles';
import { draftStorage } from '@lib/drafts';
import { 
  trackSessionStart, 
  trackProfileSave, 
  trackProfilePublish, 
  trackListingPreview, 
  trackListingPublish,
  trackListingDelete,
  trackPhotoUpload,
  trackDraftLoad,
  trackError
} from '@lib/analytics';

type ProfileFormState = ProfileFormValue;
type ListingFormState = ListingFormValue;

const initialProfileForm: ProfileFormState = {
  name: '',
  catName: '',
  intro: '',
  catPhotoId: '',
  catPhotoUrl: '',
  city: '',
  country: ''
};

const initialListingForm: ListingFormState = {
  city: '',
  country: '',
  apartmentDescription: '',
  apartmentPhotoId: '',
  apartmentPhotoUrl: '',
  dates: '',
  conditions: '',
  preferredDestinations: ''
};

const buildProfilePayload = (form: ProfileFormState): SaveProfilePayload => {
  const location = form.city && form.country ? `${form.city}, ${form.country}` : '';
  return {
    name: form.name,
    catName: form.catName,
    intro: form.intro,
    catPhotoId: form.catPhotoId,
    catPhotoUrl: form.catPhotoUrl || undefined,
    location: location || undefined
  };
};

const buildListingPayload = (form: ListingFormState): ListingDraftPayload => ({
  city: form.city,
  country: form.country,
  apartmentDescription: form.apartmentDescription,
  apartmentPhotoId: form.apartmentPhotoId,
  apartmentPhotoUrl: form.apartmentPhotoUrl || undefined,
  dates: form.dates,
  conditions: form.conditions,
  preferredDestinations: form.preferredDestinations
});

export default function TelegramMiniAppPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [channelInviteLink, setChannelInviteLink] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileFormState>(initialProfileForm);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profilePublishing, setProfilePublishing] = useState(false);
  const [catPhotoUploading, setCatPhotoUploading] = useState(false);

  const [listingForm, setListingForm] = useState<ListingFormState>(initialListingForm);
  const [listingPreview, setListingPreview] = useState<string | null>(null);
  const [listingPreviewing, setListingPreviewing] = useState(false);
  const [listingPublishing, setListingPublishing] = useState(false);
  const [apartmentPhotoUploading, setApartmentPhotoUploading] = useState(false);
  const [userListings, setUserListings] = useState<ListingsIndexItem[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);

  const handleApiError = (reason: unknown, fallback: string) => {
    if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) {
      const hadInitData = api.auth.hasInitData();
      api.auth.clear();
      setSessionReady(false);
      setError(
        hadInitData
          ? 'Не удалось обновить сессию Telegram. Закрой и заново открой мини‑эпп через бота.'
          : 'Сессия Telegram отсутствует. Запусти мини‑эпп из Telegram ещё раз.'
      );
      return;
    }
    const message = reason instanceof Error ? reason.message : fallback;
    setError(message);
  };

  useEffect(() => {
    let retryTimeout: number | undefined;
    let cancelled = false;

    const bootstrap = async (init: string) => {
      api.auth.setInitData(init);
      setSessionReady(false);
      setError(null);
      setStatus(null);
      setChannelInviteLink(null);
      try {
        const { profile, preview, profileCompleted } = await api.fetchProfile();
        if (cancelled) return;
        if (profile) {
          setProfileForm({
            name: profile.name,
            catName: profile.catName,
            intro: profile.intro,
            catPhotoId: profile.catPhotoId,
            catPhotoUrl: profile.catPhotoUrl ?? '',
            city: profile.city ?? '',
            country: profile.country ?? ''
          });
          setListingForm((prev) => ({
            ...prev,
            city: profile.city ?? prev.city,
            country: profile.country ?? prev.country
          }));
          setProfilePreview(preview ?? null);
        } else {
          setProfileForm(initialProfileForm);
          setProfilePreview(null);
        }
        setProfileCompleted(profileCompleted);
        setSessionReady(true);
        trackSessionStart();
        
        // Load draft if available
        if (profileCompleted) {
          const draft = draftStorage.load();
          if (draft && !cancelled) {
            setListingForm((prev) => ({
              ...draft,
              city: draft.city || prev.city,
              country: draft.country || prev.country
            }));
            setHasDraft(true);
            trackDraftLoad(true);
          } else {
            trackDraftLoad(false);
          }
        }
        
        try {
          const listingsResponse = await api.fetchListings();
          if (!cancelled) {
            setUserListings(listingsResponse.listings);
          }
        } catch (listError) {
          if (!cancelled) {
            handleApiError(listError, 'Не удалось получить список объявлений.');
          }
        }
      } catch (reason) {
        if (cancelled) return;
        const errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
        trackError('bootstrap', errorMessage);
        handleApiError(reason, 'Не удалось загрузить анкету.');
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    const attemptInit = () => {
      prepareTelegramWebApp();
      const data = getTelegramInitData();
      if (data) {
        void bootstrap(data);
        return;
      }
      if (isTelegramEnvironment()) {
        retryTimeout = window.setTimeout(() => {
          const retryData = getTelegramInitData();
          if (retryData) {
            void bootstrap(retryData);
          } else if (!cancelled) {
            setError('Не удалось получить initData от Telegram. Попробуйте перезапустить мини‑эпп.');
            setInitializing(false);
          }
        }, 400);
      } else {
        setError('Мини‑эпп доступно только внутри Telegram.');
        setInitializing(false);
      }
    };

    attemptInit();

    return () => {
      cancelled = true;
      if (retryTimeout) window.clearTimeout(retryTimeout);
    };
  }, []);

  const profileBusy = initializing || profileLoading || profilePublishing || catPhotoUploading;
  const listingBusy = initializing || listingPreviewing || listingPublishing || apartmentPhotoUploading;
  const listingDisabled = listingBusy || !profileCompleted || !sessionReady;
  const publishProfileDisabled = profileBusy || !sessionReady || !profileCompleted;

  const helperText = useMemo(() => {
    if (initializing) return 'Загружаем данные…';
    if (error) return null;
    if (!profileCompleted) {
      return 'Сначала заполни короткую анкету (имя, кот, рассказ и фото), затем станет доступен раздел объявления.';
    }
    return 'Все изменения уходят в общее API — мини‑эпп и веб-версия используют одну базу.';
  }, [initializing, error, profileCompleted]);

  const handleProfileChange = (field: keyof ProfileFormState, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleListingChange = (field: keyof ListingFormState, value: string) => {
    setListingForm((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-save draft
      if (profileCompleted) {
        draftStorage.save(updated);
        setHasDraft(true);
      }
      return updated;
    });
  };

  const formatTimestamp = (value: string) => {
    try {
      return new Date(value).toLocaleString('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (error) {
      return value;
    }
  };

  const getStatusBadgeStyle = (status: ListingsIndexItem['status']) => {
    if (status === 'published') {
      return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
    }
    return { background: '#f4f4f5', color: '#52525b', border: '1px solid #e4e4e7' };
  };

  const reloadListings = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setListingsLoading(true);
    }
    try {
      const { listings } = await api.fetchListings();
      setUserListings(listings);
    } catch (reason) {
      handleApiError(reason, 'Не удалось получить список объявлений.');
    } finally {
      if (!options?.silent) {
        setListingsLoading(false);
      }
    }
  };

  const deleteListingAction = async (listingId: string) => {
    if (!sessionReady || !confirm('Удалить объявление? Это действие нельзя отменить.')) return;
    
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    
    try {
      await api.deleteListing(listingId);
      setStatus('Объявление удалено.');
      await reloadListings({ silent: true });
      trackListingDelete(listingId);
    } catch (reason) {
      const errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
      trackError('listing_delete', errorMessage);
      handleApiError(reason, 'Не удалось удалить объявление.');
    }
  };

  const uploadPhoto = async (file: File, target: 'profile' | 'listing') => {
    if (!sessionReady) return;
    const setUploading = target === 'profile' ? setCatPhotoUploading : setApartmentPhotoUploading;
    setUploading(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const { fileId, url } = await api.uploadPhoto(file);
      if (target === 'profile') {
        setProfileForm((prev) => ({ ...prev, catPhotoId: fileId, catPhotoUrl: url }));
        setStatus('Фото кота загружено.');
      } else {
        setListingForm((prev) => ({ ...prev, apartmentPhotoId: fileId, apartmentPhotoUrl: url }));
        setStatus('Фото квартиры загружено.');
      }
      trackPhotoUpload(target, true);
    } catch (reason) {
      trackPhotoUpload(target, false);
      const errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
      trackError('photo_upload', errorMessage);
      handleApiError(reason, 'Не удалось загрузить фото.');
    } finally {
      setUploading(false);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionReady) return;
    setProfileLoading(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const response = await api.saveProfile(buildProfilePayload(profileForm));
      if (response.profile) {
        setProfileForm({
          name: response.profile.name,
          catName: response.profile.catName,
          intro: response.profile.intro,
          catPhotoId: response.profile.catPhotoId,
          catPhotoUrl: response.profile.catPhotoUrl ?? profileForm.catPhotoUrl,
          city: response.profile.city ?? profileForm.city,
          country: response.profile.country ?? profileForm.country
        });
        setListingForm((prev) => ({
          ...prev,
          city: response.profile?.city ?? profileForm.city,
          country: response.profile?.country ?? profileForm.country
        }));
      }
      setProfilePreview(response.preview ?? null);
      setProfileCompleted(response.profileCompleted);
      setStatus('Анкета сохранена.');
      trackProfileSave(true);
    } catch (reason) {
      trackProfileSave(false);
      const errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
      trackError('profile_save', errorMessage);
      handleApiError(reason, 'Не удалось сохранить анкету.');
    } finally {
      setProfileLoading(false);
    }
  };

  const publishProfileAction = async () => {
    if (!sessionReady || !profileCompleted) return;
    setProfilePublishing(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const response = await api.publishProfile();
      setProfilePreview(response.preview);
      setStatus('Анкета опубликована в канале!');
      setChannelInviteLink(response.channelInviteLink ?? null);
      trackProfilePublish(true);
    } catch (reason) {
      trackProfilePublish(false);
      const errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
      trackError('profile_publish', errorMessage);
      handleApiError(reason, 'Не удалось опубликовать анкету.');
    } finally {
      setProfilePublishing(false);
    }
  };

  const previewListingAction = async () => {
    if (!sessionReady || listingDisabled) return;
    setListingPreviewing(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const { preview } = await api.previewListing(buildListingPayload(listingForm));
      setListingPreview(preview);
      setStatus('Предпросмотр объявления обновлён.');
      trackListingPreview();
    } catch (reason) {
      const errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
      trackError('listing_preview', errorMessage);
      handleApiError(reason, 'Не удалось подготовить объявление.');
    } finally {
      setListingPreviewing(false);
    }
  };

  const publishListingAction = async () => {
    if (!sessionReady || listingDisabled) return;
    setListingPublishing(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      let response;
      
      if (editingListingId) {
        // Update existing listing
        response = await api.updateListing(editingListingId, {
          ...buildListingPayload(listingForm),
          publish: true
        });
        setStatus('Объявление обновлено!');
        setEditingListingId(null);
      } else {
        // Create new listing
        response = await api.createListing({
          ...buildListingPayload(listingForm),
          publish: true
        });
        setStatus(
          response.published
            ? 'Объявление опубликовано в канале!'
            : 'Черновик объявления сохранён.'
        );
      }
      
      setListingPreview(null);
      const newForm = {
        ...initialListingForm,
        city: listingForm.city,
        country: listingForm.country
      };
      setListingForm(newForm);
      draftStorage.clear();
      setHasDraft(false);
      
      if (response.channelInviteLink) {
        setChannelInviteLink(response.channelInviteLink);
      }
      await reloadListings({ silent: true });
      trackListingPublish(true);
    } catch (reason) {
      trackListingPublish(false);
      const errorMessage = reason instanceof Error ? reason.message : 'Unknown error';
      trackError('listing_publish', errorMessage);
      handleApiError(reason, 'Не удалось опубликовать объявление.');
    } finally {
      setListingPublishing(false);
    }
  };

  const loadListingForEdit = (listing: ListingsIndexItem) => {
    setEditingListingId(listing.id);
    setListingForm({
      city: listing.city,
      country: listing.country,
      apartmentDescription: listing.apartmentDescription,
      apartmentPhotoId: listing.apartmentPhotoId,
      apartmentPhotoUrl: listing.apartmentPhotoUrl ?? '',
      dates: listing.dates,
      conditions: listing.conditions,
      preferredDestinations: listing.preferredDestinations
    });
    setListingPreview(null);
    setStatus('Редактируешь существующее объявление. Внеси изменения и опубликуй.');
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingListingId(null);
    setListingForm({
      ...initialListingForm,
      city: profileForm.city,
      country: profileForm.country
    });
    setListingPreview(null);
    setStatus(null);
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 120px', lineHeight: 1.6 }}>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h1 style={{ fontSize: 32, margin: 0, color: '#1f2933' }}>Cats & Flats · Мини‑эпп</h1>
          <a
            href="/search"
            style={{
              fontSize: 14,
              color: '#2563eb',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            🔍 Поиск жилья →
          </a>
        </div>
        {helperText && <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{helperText}</p>}
      </header>

      {error && (
        <div
          style={{
            ...cardStyle,
            background: '#fff5f5',
            border: '1px solid #fca5a5',
            color: '#7f1d1d',
            marginBottom: 24
          }}
        >
          <strong style={{ display: 'block', marginBottom: 4 }}>Ошибка</strong>
          <span>{error}</span>
        </div>
      )}

      {status && (
        <div
          style={{
            ...cardStyle,
            background: '#f4fbf7',
            border: '1px solid #bbf7d0',
            color: '#14532d',
            marginBottom: 24
          }}
        >
          <strong style={{ display: 'block', marginBottom: 4 }}>Готово</strong>
          <span>{status}</span>
          {channelInviteLink && (
            <a
              href={channelInviteLink}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                marginTop: 8,
                color: '#0f766e',
                fontWeight: 600
              }}
            >
              Открыть канал
            </a>
          )}
        </div>
      )}

      <section style={cardStyle}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Анкета</h2>
        <ProfileForm
          value={profileForm}
          disabled={profileBusy || !sessionReady}
          loading={profileLoading}
          uploading={catPhotoUploading}
          onChange={handleProfileChange}
          onSubmit={submitProfile}
          onSelectPhoto={(file) => uploadPhoto(file, 'profile')}
        />

        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            style={{
              ...publishButtonStyle,
              opacity: publishProfileDisabled ? 0.6 : 1,
              cursor: publishProfileDisabled ? 'default' : 'pointer'
            }}
            onClick={publishProfileAction}
            disabled={publishProfileDisabled}
          >
            {profilePublishing ? 'Публикуем…' : 'Опубликовать анкету'}
          </button>
        </div>

        {profilePreview && (
          <article style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, opacity: 0.85 }}>Предпросмотр для канала</h3>
            <pre
              style={{
                background: '#f8fafc',
                borderRadius: 10,
                padding: 16,
                border: '1px solid #e2e8f0',
                color: '#1f2937',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 13,
                fontFamily: '"Source Code Pro", "JetBrains Mono", monospace'
              }}
            >
              {profilePreview}
            </pre>
          </article>
        )}
      </section>

      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>
            {editingListingId ? '✏️ Редактирование объявления' : 'Объявление'}
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {editingListingId && (
              <button
                type="button"
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                onClick={cancelEdit}
              >
                Отменить
              </button>
            )}
            {hasDraft && profileCompleted && !editingListingId && (
              <span style={{ 
                fontSize: 12, 
                color: '#f59e0b', 
                background: '#fef3c7', 
                padding: '4px 8px', 
                borderRadius: 6,
                fontWeight: 600
              }}>
                📝 Черновик сохранён
              </span>
            )}
          </div>
        </div>
        {!profileCompleted && (
          <div
            style={{
              marginBottom: 16,
              padding: 16,
              borderRadius: 12,
              border: '1px dashed #d4d4d8',
              background: '#f9fafb',
              fontSize: 14,
              color: '#475569'
            }}
          >
            Сначала заполни и сохрани анкету. После этого появится возможность подготовить объявление.
          </div>
        )}

        <ListingForm
          value={listingForm}
          disabled={listingDisabled}
          isPreviewing={listingPreviewing}
          isPublishing={listingPublishing}
          uploading={apartmentPhotoUploading}
          onChange={handleListingChange}
          onSelectPhoto={(file) => uploadPhoto(file, 'listing')}
          onPreview={previewListingAction}
          onPublish={publishListingAction}
        />

        {listingPreview && (
          <article style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, opacity: 0.85 }}>Предпросмотр объявления</h3>
            <pre
              style={{
                background: '#f8fafc',
                borderRadius: 10,
                padding: 16,
                border: '1px solid #e2e8f0',
                color: '#1f2937',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 13,
                fontFamily: '"Source Code Pro", "JetBrains Mono", monospace'
              }}
            >
              {listingPreview}
            </pre>
          </article>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Мои объявления</h2>
        {listingsLoading ? (
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Загружаем список объявлений…</p>
        ) : userListings.length === 0 ? (
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
            Здесь появятся сохранённые и опубликованные объявления.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
            {userListings.map((item) => {
              const statusLabel = item.status === 'published' ? 'Опубликовано' : 'Черновик';
              const badgeStyle = getStatusBadgeStyle(item.status);
              return (
                <li
                  key={item.id}
                  style={{
                    border: '1px solid #e4e4e7',
                    borderRadius: 10,
                    padding: 16,
                    display: 'grid',
                    gap: 8,
                    background: '#fafafa'
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>
                      {item.city}, {item.country}
                    </div>
                    <span
                      style={{
                        ...badgeStyle,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: '#475569' }}>{item.dates}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{item.conditions}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    Желаемые направления: {item.preferredDestinations || '—'}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {item.channelMessageId
                      ? `ID поста в канале: ${item.channelMessageId}`
                      : 'Пока не опубликовано в канале'}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    Обновлено: {formatTimestamp(item.updatedAt)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#2563eb',
                        background: '#dbeafe',
                        border: '1px solid #bfdbfe',
                        borderRadius: 8,
                        cursor: 'pointer'
                      }}
                      onClick={() => loadListingForEdit(item)}
                    >
                      ✏️ Редактировать
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#dc2626',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: 8,
                        cursor: 'pointer'
                      }}
                      onClick={() => deleteListingAction(item.id)}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
