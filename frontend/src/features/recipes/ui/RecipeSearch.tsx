interface RecipeSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function RecipeSearch({ value, onChange }: RecipeSearchProps) {
  return (
    <div className="search-field">
      <span className="search-icon" aria-hidden="true">⌕</span>
      <input
        aria-label="Поиск по названию и тегам"
        autoComplete="off"
        maxLength={200}
        placeholder="Название или тег"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && (
        <button
          aria-label="Очистить поиск"
          className="clear-search"
          onClick={() => onChange("")}
          type="button"
        >
          ×
        </button>
      )}
    </div>
  );
}
