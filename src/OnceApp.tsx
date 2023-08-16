import { useEffect } from "react";

function getQueryUrl(): string | null {
  const search = window.location.search;
  if (search.length === 0) {
    return null;
  }
  const params = new URLSearchParams(search.substring(1));
  return params.get("url");
}

export default function OnceApp() {
  useEffect(() => {
    const url = getQueryUrl();
    if (url != null) {
      const w = window.open(url);
      setTimeout(() => {
        w?.close();
        window.close();
      }, 10000);
    } else {
      setTimeout(() => {
        //window.close();
      }, 3000);
    }
  }, []);

  return <div>{getQueryUrl() != null ? "Opening" : "Missing URL"}</div>;
}
