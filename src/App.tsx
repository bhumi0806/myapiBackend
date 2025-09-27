import { useState } from "react";
import { autocomplete, translate } from "./api/namasteApi";

function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [translation, setTranslation] = useState<any[]>([]);

  // Autocomplete search
  const handleSearch = async () => {
    if (!query.trim()) return;
    const data = await autocomplete(query);
    setResults(data);
  };

  // Translate selected code
  const handleTranslate = async () => {
    if (!selectedCode) return;
    const body = {
      sourceSystem: "http://namaste.ayush.gov.in/CodeSystem/NAMASTE",
      code: selectedCode,
      targetSystem: "http://id.who.int/icd/entity",
    };
    const data = await translate(body);
    setTranslation(data.result);
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1 style={{ marginBottom: "1rem" }}>🌿 NAMASTE Terminology Explorer</h1>

      {/* Search box */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search condition (e.g. fever, herbal)..."
          style={{ padding: "0.5rem", width: "250px", marginRight: "0.5rem" }}
        />
        <button onClick={handleSearch} style={{ padding: "0.5rem 1rem" }}>
          Search
        </button>
      </div>

      {/* Autocomplete results */}
      <ul>
        {results.map((item, idx) => (
          <li
            key={idx}
            style={{
              cursor: "pointer",
              margin: "0.25rem 0",
              padding: "0.25rem",
              border: "1px solid #ddd",
              borderRadius: "6px",
              background:
                selectedCode === item.code ? "#e6ffe6" : "transparent",
            }}
            onClick={() => setSelectedCode(item.code)}
          >
            <strong>{item.display}</strong> ({item.code}) –{" "}
            <em>{item.system}</em>
          </li>
        ))}
      </ul>

      {/* Translate button */}
      {selectedCode && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleTranslate} style={{ padding: "0.5rem 1rem" }}>
            Translate "{selectedCode}"
          </button>
        </div>
      )}

      {/* Translation results */}
      {translation.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h3>🔄 Translation Result</h3>
          <ul>
            {translation.map((t, idx) => (
              <li key={idx}>
                <strong>{t.code}</strong> ({t.equivalence}) – {t.comment}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
