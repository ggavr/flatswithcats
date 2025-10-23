'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@lib/api';
import { getTelegramInitData, isTelegramEnvironment, prepareTelegramWebApp } from '@lib/telegram';
import type { ListingDraftPayload, SaveProfilePayload } from '@lib/types';
import { ProfileForm, type ProfileFormValue } from '../../components/profile/ProfileForm';
import { ListingForm, type ListingFormValue } from '../../components/listing/ListingForm';
import { cardStyle, publishButtonStyle } from '../../components/ui/styles';

type ProfileFormState = ProfileFormValue;
type ListingFormState = ListingFormValue;

const initialProfileForm: ProfileFormState = {
  name: '',
  catName: '',
  intro: '',
  catPhotoId: '',
  catPhotoUrl: ''
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

const buildProfilePayload = (form: ProfileFormState): SaveProfilePayload => ({
  name: form.name,
  catName: form.catName,
  intro: form.intro,
  catPhotoId: form.catPhotoId,
  catPhotoUrl: form.catPhotoUrl || undefined
});

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
  const [initData, setInitData] = useState<string | null>(null);
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
  const [listingLoading, setListingLoading] = useState(false);
  const [apartmentPhotoUploading, setApartmentPhotoUploading] = useState(false);

  const handleApiError = (reason: unknown, fallback: string) => {
    if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) {
      setSessionReady(false);
      setError('Сессия Telegram устарела. Закрой и заново открой мини‑эпп через кнопки бота.');
      return;
    }
    const message = reason instanceof Error ? reason.message : fallback;
    setError(message);
  };

  useEffect(() => {
    let retryTimeout: number | undefined;
    let cancelled = false;

    const bootstrap = async (init: string) => {
      api.auth.reset();
      setSessionReady(false);
      setInitData(init);
      setError(null);
      setStatus(null);
      setChannelInviteLink(null);
      try {
        const { profile, preview, profileCompleted } = await api.fetchProfile({ initData: init });
        if (cancelled) return;
        if (profile) {
          setProfileForm({
            name: profile.name,
            catName: profile.catName,
            intro: profile.intro,
            catPhotoId: profile.catPhotoId,
            catPhotoUrl: profile.catPhotoUrl ?? ''
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
        setInitData(null);
      } catch (reason) {
        if (cancelled) return;
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
  const listingBusy = initializing || listingLoading || apartmentPhotoUploading;
  const listingDisabled = listingBusy || !profileCompleted || !sessionReady;

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
    setListingForm((prev) => ({ ...prev, [field]: value }));
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
    } catch (reason) {
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
          catPhotoUrl: response.profile.catPhotoUrl ?? profileForm.catPhotoUrl
        });
        setListingForm((prev) => ({
          ...prev,
          city: response.profile?.city ?? prev.city,
          country: response.profile?.country ?? prev.country
        }));
      }
      setProfilePreview(response.preview ?? null);
      setProfileCompleted(response.profileCompleted);
      setStatus('Анкета сохранена.');
    } catch (reason) {
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
    } catch (reason) {
      handleApiError(reason, 'Не удалось опубликовать анкету.');
    } finally {
      setProfilePublishing(false);
    }
  };

  const previewListingAction = async () => {
    if (!sessionReady || listingDisabled) return;
    setListingLoading(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const { preview } = await api.previewListing(buildListingPayload(listingForm));
      setListingPreview(preview);
      setStatus('Предпросмотр объявления обновлён.');
    } catch (reason) {
      handleApiError(reason, 'Не удалось подготовить объявление.');
    } finally {
      setListingLoading(false);
    }
  };

  const publishListingAction = async () => {
    if (!sessionReady || listingDisabled) return;
    setListingLoading(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const response = await api.createListing({
        ...buildListingPayload(listingForm),
        publish: true
      });
      setListingPreview(null);
      setListingForm((prev) => ({
        ...initialListingForm,
        city: prev.city,
        country: prev.country
      }));
      setStatus(
        response.published
          ? 'Объявление опубликовано в канале!'
          : 'Черновик объявления сохранён.'
      );
      if (response.channelInviteLink) {
        setChannelInviteLink(response.channelInviteLink);
      }
    } catch (reason) {
      handleApiError(reason, 'Не удалось опубликовать объявление.');
    } finally {
      setListingLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '32px 18px 96px', lineHeight: 1.5 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Cats & Flats · Мини‑эпп</h1>
        {helperText && <p style={{ opacity: 0.7, fontSize: 14 }}>{helperText}</p>}
      </header>

      {error && (
        <div
          style={{
            ...cardStyle,
            background: 'rgba(127, 29, 29, 0.55)',
            border: '1px solid rgba(248, 113, 113, 0.45)',
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
            background: 'rgba(22, 101, 52, 0.45)',
            border: '1px solid rgba(134, 239, 172, 0.45)',
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
                color: '#22d3ee',
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
            style={{ ...publishButtonStyle, opacity: profileCompleted ? 1 : 0.5 }}
            onClick={publishProfileAction}
            disabled={profileBusy || !sessionReady || !profileCompleted}
          >
            {profilePublishing ? 'Публикуем…' : 'Опубликовать анкету'}
          </button>
        </div>

        {profilePreview && (
          <article style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8, opacity: 0.85 }}>Предпросмотр для канала</h3>
            <pre
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 12,
                padding: 16,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 13
              }}
            >
              {profilePreview}
            </pre>
          </article>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Объявление</h2>
        {!profileCompleted && (
          <div
            style={{
              marginBottom: 16,
              padding: 16,
              borderRadius: 12,
              border: '1px dashed rgba(148, 163, 184, 0.4)',
              background: 'rgba(30, 41, 59, 0.45)',
              fontSize: 14,
              opacity: 0.85
            }}
          >
            Сначала заполни и сохрани анкету. После этого появится возможность подготовить объявление.
          </div>
        )}

        <ListingForm
          value={listingForm}
          disabled={listingDisabled}
          loading={listingLoading}
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
                background: 'rgba(15, 23, 42, 0.8)',
                borderRadius: 12,
                padding: 16,
                border: '1px solid rgba(148, 163, 184, 0.2)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 13
              }}
            >
              {listingPreview}
            </pre>
          </article>
        )}
      </section>
    </main>
  );
}
