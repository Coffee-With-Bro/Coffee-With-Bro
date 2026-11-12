import { useState, useEffect } from "react";
import { API_URL } from "../lib/signTranslator";

interface DictionaryAutocompleteProps {
  transcript: string;
  onSelectWord: (completedWord: string) => void;
}

interface SuggestionResponse {
  query: string;
  count: number;
  suggestions: string[];
}

export function DictionaryAutocomplete({
  transcript,
  onSelectWord,
}: DictionaryAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [validatedWord, setValidatedWord] = useState<{ word: string; valid: boolean } | null>(null);

  
  const lastSpaceIndex = transcript.lastIndexOf(" ");
  const currentPrefix = lastSpaceIndex === -1 ? transcript : transcript.slice(lastSpaceIndex + 1);
  const activeWord = currentPrefix.trim().toUpperCase();

  
  useEffect(() => {
    if (!activeWord) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(`${API_URL}/dictionary/suggest?prefix=${encodeURIComponent(activeWord)}&limit=5`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data: SuggestionResponse) => {
          if (!cancelled) {
            setSuggestions(data.suggestions || []);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setLoading(false);
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeWord]);

  
  useEffect(() => {
    if (!transcript.endsWith(" ") || transcript.trim().length === 0) {
      return;
    }

    const tokens = transcript.trim().split(/\s+/);
    const lastToken = tokens[tokens.length - 1]?.toUpperCase();
    if (!lastToken || lastToken.length <= 1) return;

    let cancelled = false;
    fetch(`${API_URL}/dictionary/validate?word=${encodeURIComponent(lastToken)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && data.valid !== undefined) {
          setValidatedWord({ word: lastToken, valid: Boolean(data.valid) });
        }
      })
      .catch(() => {
        
      });

    return () => {
      cancelled = true;
    };
  }, [transcript]);

  if (!activeWord && !validatedWord) {
    return null;
  }

  return (
    <div className="dictionary-autocomplete-bar" aria-label="Dictionary Word Suggestions">
      <div className="dict-header-row">
        <span className="dict-label">
          📚 Dictionary Assist:
        </span>
        {activeWord && (
          <span className="dict-active-prefix">
            Prefix: <code>{activeWord}</code>
          </span>
        )}
        {loading && <span className="dict-loading-indicator">Searching…</span>}
      </div>

      {activeWord && suggestions.length > 0 && (
        <div className="dict-suggestions-list" role="list">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="dict-suggestion-chip"
              onClick={() => onSelectWord(suggestion)}
              title={`Autocomplete current word as '${suggestion}'`}
              aria-label={`Select suggestion ${suggestion}`}
            >
              <span className="dict-chip-text">{suggestion}</span>
              <span className="dict-chip-add" aria-hidden="true">↵</span>
            </button>
          ))}
        </div>
      )}

      {activeWord && !loading && suggestions.length === 0 && activeWord.length >= 2 && (
        <div className="dict-empty-notice">
          <span>No matching dictionary word for &ldquo;{activeWord}&rdquo;</span>
        </div>
      )}

      {validatedWord && (
        <div
          className={`dict-validation-badge ${
            validatedWord.valid ? "is-valid" : "is-unlisted"
          }`}
          title={
            validatedWord.valid
              ? `'${validatedWord.word}' is a verified dictionary word`
              : `'${validatedWord.word}' is not in the standard vocabulary`
          }
        >
          {validatedWord.valid ? (
            <>✓ &ldquo;{validatedWord.word}&rdquo; verified in ASL dictionary</>
          ) : (
            <>ℹ &ldquo;{validatedWord.word}&rdquo; unlisted term</>
          )}
        </div>
      )}
    </div>
  );
}
