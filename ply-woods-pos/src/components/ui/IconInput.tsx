import React from 'react';

interface IconInputProps {
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  trailing?: React.ReactNode;
  onTrailingClick?: () => void;
  autoComplete?: string;
  id?: string;
  name?: string;
}

export const IconInput: React.FC<IconInputProps> = ({
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
  trailing,
  onTrailingClick,
  autoComplete,
  id,
  name,
}) => {
  return (
    <div className="icon-field">
      <span className="icon-field__icon">{icon}</span>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className="icon-field__input"
      />
      {trailing && (
        <button type="button" className="icon-field__trail" tabIndex={-1} onClick={onTrailingClick}>
          {trailing}
        </button>
      )}
    </div>
  );
};