/**
 * Did-you-mean splash (issue #39) — shown when enrichment can't recognise
 * the typed plant name. The fuzzy catalog match (top 1) is offered as a
 * tap-to-accept suggestion; the user can also edit the name instead.
 *
 * Kept as a standalone component so the large AddPlant rewrite in #2 can
 * rebase around it without conflict.
 *
 * @legacy Pre-catalog scaffolding; new components should compose catalog primitives.
 */

export interface SuggestionOption {
  slug: string;
  latin_name: string;
  category: string;
  primary_common_name: string;
}

interface DidYouMeanSplashProps {
  typedName: string;
  suggestion: SuggestionOption | null;
  onAccept: (suggestion: SuggestionOption) => void;
  onEdit: () => void;
  retrying: boolean;
}

export function DidYouMeanSplash({
  typedName,
  suggestion,
  onAccept,
  onEdit,
  retrying,
}: DidYouMeanSplashProps) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="dym-title"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60dvh',
        gap: 16,
        textAlign: 'center',
        padding: '0 16px',
      }}
    >
      <div style={{ fontSize: 42 }} aria-hidden="true">🤔</div>
      <p id="dym-title" style={{ fontSize: 18, fontWeight: 600 }}>
        Can&rsquo;t find &ldquo;{typedName}&rdquo;.
      </p>

      {suggestion ? (
        <>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
            Did you mean:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {suggestion.latin_name}
            </strong>
            {suggestion.primary_common_name
              ? ` (${suggestion.primary_common_name})`
              : ''}
            ?
          </p>
          <button
            type="button"
            onClick={() => onAccept(suggestion)}
            disabled={retrying}
            style={{
              width: '100%',
              maxWidth: 320,
              fontSize: 16,
              fontWeight: 600,
              padding: '12px 0',
              borderRadius: 12,
              opacity: retrying ? 0.6 : 1,
            }}
          >
            {retrying ? 'Retrying...' : "Yes, that's it!"}
          </button>
        </>
      ) : (
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          We don&rsquo;t have a close match in our catalog yet.
        </p>
      )}

      <button
        type="button"
        onClick={onEdit}
        disabled={retrying}
        style={{
          width: '100%',
          maxWidth: 320,
          fontSize: 15,
          fontWeight: 500,
          padding: '12px 0',
          borderRadius: 12,
          background: 'transparent',
          border: '1px solid var(--border, #ccc)',
          color: 'var(--text-primary)',
          opacity: retrying ? 0.6 : 1,
        }}
      >
        Edit name
      </button>
    </div>
  );
}
