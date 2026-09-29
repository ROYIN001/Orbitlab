/**
 * The placement test (roadmap E03): a bank of questions in six areas, drawn
 * 25 at a time with the areas and difficulty levels balanced the same in every
 * draw, and scored into strengths, weak areas, misconceptions and a
 * recommended place to start. Plain data, like the lessons, so a teacher's file
 * can add questions of its own.
 */
import type { Domain, LocalText } from '../types';

export type Level = 1 | 2 | 3;

/**
 * `knowledge`: a fact one knows or not, answered with an "I don't know" option
 * beside the choices. `understanding`: a question where being sure of a wrong
 * answer leads somewhere bad, so the student also says how sure they are.
 */
export type QuestionKind = 'knowledge' | 'understanding';

/** A picture beside the question. */
export type Figure =
  /** a series of a flight recorded from this simulator (`flights.json`) */
  | { kind: 'chart'; dataset: string; series: FlightSeries; compare?: string[]; tMax?: number }
  /** a photograph of a launch vehicle */
  | { kind: 'vehicle'; vehicleId: string }
  /** a diagram drawn for the question (`diagrams.ts`), with the student's own numbers in it */
  | { kind: 'diagram'; id: string };

export type FlightSeries = 'alt' | 'vInertial' | 'q' | 'gLoad' | 'mass' | 'thrust' | 'pitch' | 'dvRemaining';

export interface QuestionBase {
  id: string;
  domain: Domain;
  level: Level;
  kind: QuestionKind;
  /** a narrower topic, so one draw does not ask the same thing twice */
  skill: string;
  prompt: LocalText;
  /** shown with the answers after the test */
  explanation: LocalText;
  figure?: Figure;
  /** lessons that teach it */
  lessons?: string[];
  /** a teacher's question, read from a file */
  custom?: boolean;
}

export interface ChoiceOption {
  text: LocalText;
  correct?: boolean;
  /** the misunderstanding that leads to this wrong answer */
  misconception?: LocalText;
}

export interface ChoiceQuestion extends QuestionBase {
  type: 'choice';
  options: ChoiceOption[];
  /**
   * Predict, then observe: after the answer, this figure shows what the
   * simulator did (flights of the same mission recorded with and without the
   * change the question asks about).
   */
  observe?: Figure;
  /** show the options in their own order (e.g. numbers that ascend) */
  fixedOrder?: boolean;
}

/** A parameter drawn per student from the test's seed. */
export interface NumericParam { name: string; min: number; max: number; step: number }

export interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  /** `{name}` in the prompt is replaced by the drawn value */
  params: NumericParam[];
  /** the answer, as an expression of the parameters (`expression.ts`) */
  answer: string;
  unit: string;
  /** relative tolerance, % */
  tolPct: number;
}

/** One of the fleet's vehicles drawn as it stands on the pad: which is it? */
export interface VehicleQuestion extends QuestionBase {
  type: 'vehicle';
  /** the vehicles it may show; the other options are drawn from the same list */
  vehicles: string[];
}

/** Put the items in order: the items are listed in the right order and shown shuffled. */
export interface OrderQuestion extends QuestionBase {
  type: 'order';
  items: LocalText[];
}

/** Choose every option that is right: two or more are. */
export interface MultiQuestion extends QuestionBase {
  type: 'multi';
  options: ChoiceOption[];
}

export type Question = ChoiceQuestion | NumericQuestion | VehicleQuestion | OrderQuestion | MultiQuestion;

/** A question as one student sees it: the options shuffled, the numbers drawn. */
export interface PreparedQuestion {
  id: string;
  /** option (or item) indices into `question.options` (`items`), in the order shown */
  order?: number[];
  /** drawn parameter values */
  values?: Record<string, number>;
  /** the vehicle shown, and the vehicle ids offered, in order */
  vehicle?: string;
  vehicleOptions?: string[];
}

export type Confidence = 'guess' | 'unsure' | 'sure';

export interface Answer {
  id: string;
  /**
   * index into `question.options` (choice), the vehicle id (vehicle), the
   * number typed (numeric), the item indices in the order put (order: `2,0,1`)
   * or the options chosen, ascending (multi: `0,3`); null: "I don't know" or skipped
   */
  value: number | string | null;
  confidence?: Confidence;
  skipped?: boolean;
}

export type AssessmentKind = 'pre' | 'post';

export interface AssessmentAttempt {
  kind: AssessmentKind;
  seed: number;
  startedAt: string;
  finishedAt?: string;
  questions: PreparedQuestion[];
  answers: Answer[];
}
