import type { Ask, Option } from "../lib/api-types";
import { OptionButtons } from "./OptionButtons";

export function AskOptions({ ask, disabled, onPick }: { ask: Ask; disabled: boolean; onPick: (o: Option) => void }) {
  return <OptionButtons options={ask.options} disabled={disabled} onPick={onPick} />;
}
