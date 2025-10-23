'use client';

import type { CSSProperties, ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@lib/api';
import { getTelegramInitData, prepareTelegramWebApp, isTelegramEnvironment } from '@lib/telegram';
import type { ListingDraftPayload, SaveProfilePayload } from '@lib/types';

type ProfileFormState = SaveProfilePayload;
type ListingFormState = ListingDraftPayload;

const initialProfileForm: ProfileFormState = {
  name: '',
  location: '',
  intro: '',
  catName: '',
  catPhotoId: '',
  catPhotoUrl: ''
};

const initialListingForm: ListingFormState = {
  apartmentDescription: '',
  apartmentPhotoId: '',
  apartmentPhotoUrl: '',
  dates: '',
  conditions: '',
  preferredDestinations: ''
};

const cardStyle: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.65)',
  borderRadius: 16,
  padding: 24,
  border: '1px solid rgba(148, 163, 184, 0.15)',
  marginBottom: 24,
  backdropFilter: 'blur(12px)'
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 6,
  color: '#bae6fd'
};

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.3)',
  background: 'rgba(15, 23, 42, 0.35)',
  color: '#f8fafc',
  fontSize: 15,
  boxSizing: 'border-box'
};

const textareaStyle: CSSProperties = {
  ...fieldStyle,
  minHeight: 96,
  resize: 'vertical'
};

const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 12,
  padding: '12px 18px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
  color: '#0f172a',
  transition: 'transform 0.15s ease'
};

const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'rgba(148, 163, 184, 0.2)',
  color: '#e2e8f0',
  border: '1px solid rgba(148, 163, 184, 0.35)'
};

const successButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'linear-gradient(135deg, #22c55e, #14b8a6)'
};

const publishButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'linear-gradient(135deg, #f97316, #ec4899)'
};

export default function TelegramMiniAppPage() {
  const [initData, setInitData] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [channelInviteLink, setChannelInviteLink] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileFormState>(initialProfileForm);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profilePublishing, setProfilePublishing] = useState(false);
  const [catPhotoUploading, setCatPhotoUploading] = useState(false);

  const [listingForm, setListingForm] = useState<ListingFormState>(initialListingForm);
  const [listingPreview, setListingPreview] = useState<string | null>(null);
  const [listingLoading, setListingLoading] = useState(false);
  const [apartmentPhotoUploading, setApartmentPhotoUploading] = useState(false);

  const catPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const apartmentPhotoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    prepareTelegramWebApp();
    const data = getTelegramInitData();
    if (!data) {
      const message = isTelegramEnvironment()
        ? 'Не удалось получить initData от Telegram. Попробуйте перезапустить мини‑эпп.'
        : 'Мини‑эпп доступно только внутри Telegram.';
      setError(message);
      setInitializing(false);
      return;
    }
    setInitData(data);
    api
      .fetchProfile(data)
      .then(({ profile, preview }) => {
        if (profile) {
          setProfileForm({
            name: profile.name,
            location: `${profile.city}, ${profile.country}`.trim(),
            intro: profile.intro,
            catName: profile.catName,
            catPhotoId: profile.catPhotoId,
            catPhotoUrl: profile.catPhotoUrl ?? ''
          });
          setProfilePreview(preview ?? null);
        }
      })
      .catch((reason) => {
        const message = reason instanceof Error ? reason.message : 'Не удалось загрузить анкету.';
        setError(message);
      })
      .finally(() => setInitializing(false));
  }, []);

  const handleProfileChange = (field: keyof ProfileFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setProfileForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleListingChange = (field: keyof ListingFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      setListingForm((prev) => ({ ...prev, [field]: value }));
    };

  const uploadPhoto = async (file: File, target: 'profile' | 'listing') => {
    if (!initData) return;
    const setUploading = target === 'profile' ? setCatPhotoUploading : setApartmentPhotoUploading;
    setUploading(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const { fileId, url } = await api.uploadPhoto(initData, file);
      if (target === 'profile') {
        setProfileForm((prev) => ({ ...prev, catPhotoId: fileId, catPhotoUrl: url }));
        setStatus('Фото кота загружено.');
      } else {
        setListingForm((prev) => ({ ...prev, apartmentPhotoId: fileId, apartmentPhotoUrl: url }));
        setStatus('Фото квартиры загружено.');
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось загрузить фото.';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleCatPhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void uploadPhoto(file, 'profile');
    }
    event.target.value = '';
  };

  const handleApartmentPhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void uploadPhoto(file, 'listing');
    }
    event.target.value = '';
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!initData) return;
    setProfileLoading(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const { profile, preview } = await api.saveProfile(initData, profileForm);
      if (profile) {
        setProfileForm({
          name: profile.name,
          location: `${profile.city}, ${profile.country}`.trim(),
          intro: profile.intro,
          catName: profile.catName,
          catPhotoId: profile.catPhotoId,
          catPhotoUrl: profile.catPhotoUrl ?? profileForm.catPhotoUrl
        });
      }
      setProfilePreview(preview ?? null);
      setStatus('Анкета сохранена.');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось сохранить анкету.';
      setError(message);
    } finally {
      setProfileLoading(false);
    }
  };

  const publishProfileAction = async () => {
    if (!initData) return;
    setProfilePublishing(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const response = await api.publishProfile(initData);
      setProfilePreview(response.preview);
      setStatus('Анкета опубликована в канале!');
      setChannelInviteLink(response.channelInviteLink ?? null);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось опубликовать анкету.';
      setError(message);
    } finally {
      setProfilePublishing(false);
    }
  };

  const previewListingAction = async () => {
    if (!initData) return;
    setListingLoading(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const { preview } = await api.previewListing(initData, listingForm);
      setListingPreview(preview);
      setStatus('Предпросмотр объявления обновлён.');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось подготовить объявление.';
      setError(message);
    } finally {
      setListingLoading(false);
    }
  };

  const publishListingAction = async () => {
    if (!initData) return;
    setListingLoading(true);
    setError(null);
    setStatus(null);
    setChannelInviteLink(null);
    try {
      const response = await api.createListing(initData, { ...listingForm, publish: true });
      setListingPreview(null);
      setListingForm(initialListingForm);
      setStatus(
        response.published
          ? 'Объявление опубликовано в канале!'
          : 'Черновик объявления сохранён.'
      );
      if (response.channelInviteLink) {
        setChannelInviteLink(response.channelInviteLink);
      }
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось опубликовать объявление.';
      setError(message);
    } finally {
      setListingLoading(false);
    }
  };
  const profileBusy = initializing || profileLoading || profilePublishing || catPhotoUploading;
  const listingBusy = initializing || listingLoading || apartmentPhotoUploading;

  const helperText = useMemo(() => {
    if (initializing) return 'Загружаем данные…';
    if (error) return null;
    return 'Все изменения сохраняются через общее API — мини‑эпп и Telegram-бот используют общую базу.';
  }, [initializing, error]);

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
        <form onSubmit={submitProfile} style={{ display: 'grid', gap: 16 }}>
          <label style={labelStyle}>
            Имя
            <input
              type="text"
              value={profileForm.name}
              onChange={handleProfileChange('name')}
              required
              style={fieldStyle}
              placeholder="Например: Анна"
              disabled={profileBusy}
            />
          </label>
          <label style={labelStyle}>
            Город и страна
            <input
              type="text"
              value={profileForm.location}
              onChange={handleProfileChange('location')}
              required
              style={fieldStyle}
              placeholder="Барселона, Испания"
              disabled={profileBusy}
            />
          </label>
          <label style={labelStyle}>
            О себе
            <textarea
              value={profileForm.intro}
              onChange={handleProfileChange('intro')}
              required
              style={textareaStyle}
              placeholder="Коротко расскажи о себе"
              disabled={profileBusy}
            />
          </label>
          <label style={labelStyle}>
            Имя кота
            <input
              type="text"
              value={profileForm.catName}
              onChange={handleProfileChange('catName')}
              required
              style={fieldStyle}
              placeholder="Например: Мэйби"
              disabled={profileBusy}
            />
          </label>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={labelStyle}>
              Фото кота (Telegram file id или URL)
              <input
                type="text"
                value={profileForm.catPhotoId}
                onChange={handleProfileChange('catPhotoId')}
                required
                style={fieldStyle}
                placeholder="BAACAgIAAxkBA..."
                disabled={profileBusy}
              />
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                ref={catPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleCatPhotoSelect}
                disabled={profileBusy}
              />
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => catPhotoInputRef.current?.click()}
                disabled={profileBusy || !initData}
              >
                {catPhotoUploading ? 'Загружаем…' : 'Загрузить фото'}
              </button>
              {profileForm.catPhotoUrl && (
                <a
                  href={profileForm.catPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: '#38bdf8' }}
                >
                  Открыть фото
                </a>
              )}
            </div>
          </div>
          <button type="submit" style={buttonStyle} disabled={profileBusy || !initData}>
            {profileLoading ? 'Сохраняем…' : 'Сохранить анкету'}
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            style={publishButtonStyle}
            onClick={publishProfileAction}
            disabled={profileBusy || !initData}
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
        <div style={{ display: 'grid', gap: 16 }}>
          <label style={labelStyle}>
            Описание жилья
            <textarea
              value={listingForm.apartmentDescription}
              onChange={handleListingChange('apartmentDescription')}
              required
              style={textareaStyle}
              placeholder="Двухкомнатная квартира, есть рабочее место..."
              disabled={listingBusy}
            />
          </label>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={labelStyle}>
              Фото квартиры (file id или URL)
              <input
                type="text"
                value={listingForm.apartmentPhotoId}
                onChange={handleListingChange('apartmentPhotoId')}
                required
                style={fieldStyle}
                placeholder="BAACAgIAAxkBA..."
                disabled={listingBusy}
              />
            </label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                ref={apartmentPhotoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleApartmentPhotoSelect}
                disabled={listingBusy}
              />
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => apartmentPhotoInputRef.current?.click()}
                disabled={listingBusy || !initData}
              >
                {apartmentPhotoUploading ? 'Загружаем…' : 'Загрузить фото'}
              </button>
              {listingForm.apartmentPhotoUrl && (
                <a
                  href={listingForm.apartmentPhotoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: '#38bdf8' }}
                >
                  Открыть фото
                </a>
              )}
            </div>
          </div>
          <label style={labelStyle}>
            Даты
            <input
              type="text"
              value={listingForm.dates}
              onChange={handleListingChange('dates')}
              required
              style={fieldStyle}
              placeholder="1 июня - 30 июня 2025"
              disabled={listingBusy}
            />
          </label>
          <label style={labelStyle}>
            Условия
            <textarea
              value={listingForm.conditions}
              onChange={handleListingChange('conditions')}
              required
              style={textareaStyle}
              placeholder="Взаимный обмен, оплачиваем коммуналку..."
              disabled={listingBusy}
            />
          </label>
          <label style={labelStyle}>
            Желаемые направления
            <input
              type="text"
              value={listingForm.preferredDestinations}
              onChange={handleListingChange('preferredDestinations')}
              required
              style={fieldStyle}
              placeholder="Берлин, Прага"
              disabled={listingBusy}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
          <button type="button" style={buttonStyle} onClick={previewListingAction} disabled={listingBusy || !initData}>
            {listingLoading ? 'Готовим…' : 'Предпросмотр'}
          </button>
          <button
            type="button"
            style={successButtonStyle}
            onClick={publishListingAction}
            disabled={listingBusy || !initData}
          >
            {listingLoading ? 'Публикуем…' : 'Опубликовать'}
          </button>
        </div>

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
