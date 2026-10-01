/**
 * The scenario link (roadmap T01; Phase 4 map §4.1): `?scenario=z…` carries a
 * whole lesson file — the instructor's own lessons, missions and criteria —
 * deflated and in base64url, the scheme of the mission link generalised
 * (`encodeJsonParam`, src/config/mission-file.ts). Opening it reads the file
 * as "Open lesson file" does and starts its lesson; `?lesson=<id>` stays for
 * the catalogue's ids. DOM-free.
 *
 * A link has a length a file does not. The address goes to the web server
 * that serves the app when it is opened (as a mission link's does; the file
 * holds the instructor's lesson, never a student's data), and servers and
 * proxies commonly refuse a request line over 8 KB — nginx's default header
 * buffer is 8 KB — while chat apps cut or refuse long messages. So a link is
 * offered only up to `SCENARIO_LINK_MAX` characters of the whole address;
 * past that, the page says so and offers the file instead. Measured
 * (tests/scenario-link.test.ts): lesson 1.1 with its brief, debrief and hints
 * in three languages is 3 470 characters; a lesson written on the authoring
 * page with short texts, 1 248; the two-lesson v1 fixture (16 237 bytes of
 * JSON), 6 536; every built-in flight lesson together, 52 837 — a file.
 */
import { decodeJsonParam, encodeJsonParam } from '../config/mission-file';
import { lessonFileDocument } from './lesson-file';
import type { CatalogLesson } from './types';
import type { Question } from './assessment/types';

/** The query parameter a scenario link carries its lesson file in. */
export const SCENARIO_PARAM = 'scenario';
/** The longest address offered as a link, in characters (see the header). */
export const SCENARIO_LINK_MAX = 8000;

export interface ScenarioLink {
  /** the whole address */
  url: string;
  /** its length, characters */
  length: number;
  /** short enough to offer (`SCENARIO_LINK_MAX`) */
  fits: boolean;
}

/**
 * The address that opens these lessons: `page` (the app's own address; its
 * query and fragment are dropped) with the lesson file in `?scenario=`.
 */
export async function scenarioLink(page: string, lessons: readonly CatalogLesson[], questions: readonly Question[] = []): Promise<ScenarioLink> {
  const url = new URL(page);
  url.search = '';
  url.hash = '';
  url.searchParams.set(SCENARIO_PARAM, await encodeJsonParam(lessonFileDocument(lessons, questions)));
  const text = url.toString();
  return { url: text, length: text.length, fits: text.length <= SCENARIO_LINK_MAX };
}

/** A scenario link's parameter back to the lesson file it carries (read it with `parseLessonFile`); throws when it is not one. */
export function readScenarioParam(param: string): Promise<unknown> {
  return decodeJsonParam(param);
}
