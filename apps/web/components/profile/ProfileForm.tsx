'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useRef } from 'react';
import {
  buttonStyle,
  fieldStyle,
  labelStyle,
  secondaryButtonStyle,
  textareaStyle
} from '../ui/styles';

export interface ProfileFormValue {
  name: string;
  catName: string;
  intro: string;
  catPhotoId: string;
  catPhotoUrl: string;
  city: string;
  country: string;
}

export interface ProfileFormProps {
  value: ProfileFormValue;
  disabled?: boolean;
  loading?: boolean;
  uploading?: boolean;
  submitLabel?: string;
  onChange: (field: keyof ProfileFormValue, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectPhoto: (file: File) => void;
}

export const ProfileForm = ({
  value,
  disabled = false,
  loading = false,
  uploading = false,
  submitLabel = 'Сохранить анкету',
  onChange,
  onSubmit,
  onSelectPhoto
}: ProfileFormProps) => {
  const catPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange =
    (field: keyof ProfileFormValue) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(field, event.target.value);
    };

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onSelectPhoto(file);
    }
    event.target.value = '';
  };

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16 }}>
      <label style={labelStyle}>
        Имя
        <input
          type="text"
          value={value.name}
          onChange={handleInputChange('name')}
          required
          style={fieldStyle}
          placeholder="Например: Анна"
          disabled={disabled}
        />
      </label>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label style={{ ...labelStyle, flex: 1, minWidth: 120 }}>
          Город
          <input
            type="text"
            value={value.city}
            onChange={handleInputChange('city')}
            required
            style={fieldStyle}
            placeholder="Барселона"
            disabled={disabled}
          />
        </label>
        <label style={{ ...labelStyle, flex: 1, minWidth: 140 }}>
          Страна
          <input
            type="text"
            value={value.country}
            onChange={handleInputChange('country')}
            required
            style={fieldStyle}
            placeholder="Испания"
            disabled={disabled}
          />
        </label>
      </div>
      <label style={labelStyle}>
        Имя кота
        <input
          type="text"
          value={value.catName}
          onChange={handleInputChange('catName')}
          required
          style={fieldStyle}
          placeholder="Например: Мэйби"
          disabled={disabled}
        />
      </label>
      <label style={labelStyle}>
        О себе
        <textarea
          value={value.intro}
          onChange={handleInputChange('intro')}
          required
          style={textareaStyle}
          placeholder="Коротко расскажи о себе"
          disabled={disabled}
        />
      </label>
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={labelStyle}>
          Фото кота (Telegram file id или URL)
          <input
            type="text"
            value={value.catPhotoId}
            onChange={handleInputChange('catPhotoId')}
            required
            style={fieldStyle}
            placeholder="BAACAgIAAxkBA..."
            disabled={disabled}
          />
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            ref={catPhotoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
            disabled={disabled}
          />
          <button
            type="button"
            style={{
              ...secondaryButtonStyle,
              opacity: disabled ? 0.55 : 1,
              cursor: disabled ? 'default' : 'pointer'
            }}
            onClick={() => catPhotoInputRef.current?.click()}
            disabled={disabled}
          >
            {uploading ? 'Загружаем…' : 'Загрузить фото'}
          </button>
          {value.catPhotoUrl && (
            <a
              href={value.catPhotoUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 13, color: '#2563eb' }}
            >
              Открыть фото
            </a>
          )}
        </div>
        {value.catPhotoUrl && (
          <div style={{ marginTop: 8 }}>
            <img
              src={value.catPhotoUrl}
              alt="Фото кота"
              style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid #e4e4e7' }}
            />
          </div>
        )}
      </div>
      <button
        type="submit"
        style={{ ...buttonStyle, opacity: disabled ? 0.6 : 1, cursor: disabled ? 'default' : 'pointer' }}
        disabled={disabled}
      >
        {loading ? 'Сохраняем…' : submitLabel}
      </button>
    </form>
  );
};
