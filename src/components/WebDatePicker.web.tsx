import React from 'react';
import DatePicker from 'react-date-picker';
import type { Value } from 'react-date-picker/dist/shared/types';
import 'react-date-picker/dist/DatePicker.css';
import 'react-calendar/dist/Calendar.css';

type Props = {
  value: string;
  onChange: (isoDate: string) => void;
};

export default function WebDatePicker({ value, onChange }: Props) {
  const dateValue = value.trim() ? new Date(value.trim() + 'T12:00:00.000Z') : null;

  const handleChange = (val: Value) => {
    if (val instanceof Date) {
      onChange(val.toISOString().slice(0, 10));
    } else {
      onChange('');
    }
  };

  return (
    <>
      <style>{`
        .web-date-picker {
          width: 100%;
        }
        .web-date-picker .react-date-picker__wrapper {
          border: 1px solid #E5E7EB;
          border-radius: 15px;
          padding: 12px 15px;
          background: #FFFFFF;
          font-size: 14px;
          color: #1D2131;
          width: 100%;
          box-sizing: border-box;
        }
        .web-date-picker .react-date-picker__inputGroup__input {
          color: #1D2131;
          font-size: 14px;
        }
        .web-date-picker .react-date-picker__button {
          padding: 0 4px;
        }
        .web-date-picker .react-calendar {
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          font-family: Inter, system-ui, sans-serif;
        }
        .web-date-picker .react-calendar__tile--active {
          background: #1D2131;
          color: white;
          border-radius: 8px;
        }
        .web-date-picker .react-calendar__tile--active:enabled:hover,
        .web-date-picker .react-calendar__tile--active:enabled:focus {
          background: #3D4151;
        }
      `}</style>
      <DatePicker
        className="web-date-picker"
        value={dateValue}
        onChange={handleChange}
        format="MM/dd/y"
        clearIcon={null}
      />
    </>
  );
}
