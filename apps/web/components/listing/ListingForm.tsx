'use client';

import type { ChangeEvent } from 'react';
import { useRef } from 'react';
import {
  buttonStyle,
  fieldStyle,
  labelStyle,
  secondaryButtonStyle,
  successButtonStyle,
  textareaStyle
} from '../ui/styles';

export interface ListingFormValue {
  city: string;
  country: string;
  apartmentDescription: string;
  apartmentPhotoId: string;
  apartmentPhotoUrl: string;
  dates: string;
  conditions: string;
  preferredDestinations: string;
}

export interface ListingFormProps {
  value: ListingFormValue;
  disabled?: boolean;
  loading?: boolean;
  uploading?: boolean;
  onChange: (field: keyof ListingFormValue, value: string) => void;
  onPreview: () => void;
  onPublish: () => void;
  onSelectPhoto: (file: File) => void;
}

export const ListingForm = ({
  value,
  disabled = false,
  loading = false,
  uploading = false,
  onChange,
  onPreview,
  onPublish,
  onSelectPhoto
}: ListingFormProps) => {
  const apartmentPhotoInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange =
    (field: keyof ListingFormValue) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label style={{ ...labelStyle, flex: 1, minWidth: 120 }}>
          Город
          <input
            type="text"
            value={value.city}
            onChange={handleChange('city')}
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
            onChange={handleChange('country')}
            required
            style={fieldStyle}
            placeholder="Испания"
            disabled={disabled}
          />
        </label>
      </div>
      <label style={labelStyle}>
        Описание жилья
        <textarea
          value={value.apartmentDescription}
          onChange={handleChange('apartmentDescription')}
          required
          style={textareaStyle}
          placeholder="Двухкомнатная квартира, есть рабочее место..."
          disabled={disabled}
        />
      </label>
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={labelStyle}>
          Фото квартиры (file id или URL)
          <input
            type="text"
            value={value.apartmentPhotoId}
            onChange={handleChange('apartmentPhotoId')}
            required
            style={fieldStyle}
            placeholder="BAACAgIAAxkBA..."
            disabled={disabled}
          />
        </label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            ref={apartmentPhotoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handlePhotoSelect}
            disabled={disabled}
          />
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => apartmentPhotoInputRef.current?.click()}
            disabled={disabled}
          >
            {uploading ? 'Загружаем…' : 'Загрузить фото'}
          </button>
          {value.apartmentPhotoUrl && (
            <a
              href={value.apartmentPhotoUrl}
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
          value={value.dates}
          onChange={handleChange('dates')}
          required
          style={fieldStyle}
          placeholder="1 июня - 30 июня 2025"
          disabled={disabled}
        />
      </label>
      <label style={labelStyle}>
        Условия
        <textarea
          value={value.conditions}
          onChange={handleChange('conditions')}
          required
          style={textareaStyle}
          placeholder="Взаимный обмен, оплачиваем коммуналку..."
          disabled={disabled}
        />
      </label>
      <label style={labelStyle}>
        Желаемые направления
        <input
          type="text"
          value={value.preferredDestinations}
          onChange={handleChange('preferredDestinations')}
          required
          style={fieldStyle}
          placeholder="Берлин, Прага"
          disabled={disabled}
        />
      </label>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
        <button type="button" style={buttonStyle} onClick={onPreview} disabled={disabled}>
          {loading ? 'Готовим…' : 'Предпросмотр'}
        </button>
        <button type="button" style={successButtonStyle} onClick={onPublish} disabled={disabled}>
          {loading ? 'Публикуем…' : 'Опубликовать'}
        </button>
      </div>
    </div>
  );
};
