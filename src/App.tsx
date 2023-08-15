import { CronJob } from "cron";
import { List } from "immutable";
import { useCallback, useEffect, useMemo, useRef } from "react";

import useStateLocalStorage from "./useStateLocalStorage";

import styles from "./App.module.scss";

interface Site {
  id: number;
  cron: string;
  url: string;
  running: boolean;
}

interface Runner {
  cron: string;
  url: string;
  job: CronJob | null;
}

function refresh(handles: Map<number, Window>, site: Site) {
  handles.set(site.id, window.open(site.url, site.id.toString())!);
}

function makeCron(handles: Map<number, Window>, site: Site) {
  try {
    return new CronJob(site.cron, () => refresh(handles, site), null, false);
  } catch (e) {
    return null;
  }
}

function Sites(props: {
  sites: List<Site>;
  onDelete: (index: number) => void;
  onUpdate: (k: Iterable<unknown>, v: unknown) => void;
}) {
  const { sites, onDelete, onUpdate } = props;

  const elements = useMemo(() => {
    return sites.map((site, index) => {
      return (
        <div key={index} className={styles.site}>
          <button className={styles.delete} onClick={() => onDelete(index)}>
            &times;
          </button>
          <input
            className={styles.cron}
            type="text"
            value={site.cron}
            onChange={(event) => onUpdate([index, "cron"], event.target.value)}
            readOnly={site.running}
          />
          <input
            className={styles.url}
            type="text"
            value={site.url}
            onChange={(event) => onUpdate([index, "url"], event.target.value)}
            readOnly={site.running}
          />
          <input
            className={styles.running}
            type="checkbox"
            checked={site.running}
            onChange={(event) =>
              onUpdate([index, "running"], event.target.checked)
            }
          />
        </div>
      );
    });
  }, [onDelete, onUpdate, sites]);

  return <div className={styles.sites}>{elements}</div>;
}

function AddButton(props: { onAdd: () => void }) {
  return (
    <button className={styles.add} onClick={props.onAdd}>
      Add Site
    </button>
  );
}

export default function App() {
  const [sites, setSites] = useStateLocalStorage<List<Site>>(
    "sites",
    List(),
    (l: List<Site>) => JSON.stringify(l.toArray()),
    // Reset running to false
    (s: string) =>
      List(
        JSON.parse(s).map((s: any) => {
          s.running = false;
          return s;
        })
      )
  );
  const runners = useRef<Map<number, Runner>>(new Map());
  const handles = useRef<Map<number, Window>>(new Map());

  const onAdd = useCallback(() => {
    setSites((prevSites) =>
      prevSites.push({
        id: Date.now(),
        cron: "0 0 * * * *",
        url: "https://reddit.com",
        running: false,
      })
    );
  }, []);

  const onDelete = useCallback((index: number) => {
    setSites((prevSites) => prevSites.delete(index));
  }, []);

  const onUpdate = useCallback((k: Iterable<unknown>, v: unknown) => {
    setSites((prevSites) => prevSites.setIn(k, v));
  }, []);

  useEffect(() => {
    // Delete any old runners
    for (const [k, v] of runners.current.entries()) {
      if (sites.find((s) => s.id === k) == null) {
        v.job?.stop();
        runners.current.delete(k);

        const h = handles.current.get(k);
        if (h != null) {
          h.close();
          handles.current.delete(k);
        }
      }
    }

    // Create or update runners
    for (const s of sites) {
      let r = runners.current.get(s.id);
      if (r != null && (r.cron !== s.cron || r.url !== s.url)) {
        if (r.job != null) {
          r.job.stop();
        }
        r.job = makeCron(handles.current, s);
      } else if (r == null) {
        r = {
          cron: s.cron,
          url: s.url,
          job: makeCron(handles.current, s),
        };
        runners.current.set(s.id, r);
      }

      // Start or stop jobs
      if (r.job != null) {
        if (r.job.running && !s.running) {
          r.job.stop();
        } else if (!r.job.running && s.running) {
          r.job.start();
        }
      }
    }
  }, [sites]);

  return (
    <div className={styles.app}>
      <h1>Cron Refresher</h1>
      <hr />
      <Sites sites={sites} onDelete={onDelete} onUpdate={onUpdate} />
      <AddButton onAdd={onAdd} />
    </div>
  );
}
