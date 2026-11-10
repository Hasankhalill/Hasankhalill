import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { branding } from "../config/branding.js";

export function SearchForm({ id, initialQuery = "", onSearch, className = "" }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  return (
    <form
      role="search"
      className={`flex items-center gap-2 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        if (onSearch) {
          onSearch(query);
          return;
        }
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        navigate({ pathname: "/shop", search: params.toString() });
      }}
    >
      <label className="sr-only" htmlFor={id}>
        Search equipment
      </label>
      <input
        id={id}
        className="field"
        type="search"
        name="q"
        value={value}
        placeholder={branding.copy.searchPlaceholder}
        onChange={(event) => setValue(event.target.value)}
      />
      <button className="btn btn-navy shrink-0 px-4" type="submit">
        Search
      </button>
    </form>
  );
}
