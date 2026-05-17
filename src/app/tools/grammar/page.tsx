"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Correction {
  type: "spelling" | "grammar" | "punctuation" | "style";
  message: string;
  suggestion: string;
  original: string;
  start: number;
  end: number;
}

const DICTIONARY: string[] = [
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
  "may", "might", "must", "shall", "can", "need", "dare", "ought",
  "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
  "my", "your", "his", "its", "our", "their", "mine", "yours", "hers", "ours", "theirs",
  "this", "that", "these", "those", "who", "whom", "whose", "which", "what",
  "here", "there", "where", "when", "why", "how",
  "and", "but", "or", "nor", "for", "yet", "so", "because", "although", "while",
  "if", "then", "else", "unless", "since", "as", "until", "after", "before",
  "in", "on", "at", "to", "for", "with", "by", "from", "of", "about", "into",
  "through", "during", "without", "between", "under", "over", "above", "below",
  "not", "no", "never", "always", "sometimes", "often", "rarely", "usually",
  "very", "quite", "too", "enough", "just", "also", "only", "even", "still",
  "well", "good", "bad", "big", "small", "great", "little", "many", "much",
  "some", "any", "each", "every", "both", "all", "few", "more", "most", "other",
  "one", "two", "three", "four", "five", "first", "second", "last", "next",
  "new", "old", "high", "low", "long", "short", "same", "different",
  "own", "such", "right", "wrong", "important", "possible", "able",
  "go", "come", "take", "give", "make", "get", "see", "find", "know", "think",
  "say", "tell", "ask", "show", "try", "leave", "call", "keep", "let", "begin",
  "seem", "help", "turn", "start", "bring", "run", "move", "live", "believe",
  "hold", "work", "study", "write", "read", "speak", "listen", "play", "use",
  "want", "need", "mean", "feel", "like", "love", "hope", "wish", "thank",
  "please", "sorry", "hello", "goodbye", "yes",
  // Common -ly adverbs
  "quickly", "slowly", "carefully", "easily", "happily", "sadly", "angrily",
  "freely", "fully", "greatly", "highly", "largely", "mainly", "mostly",
  "nearly", "partly", "presently", "probably", "really", "simply", "strongly",
  "truly", "widely", "absolutely", "certainly", "clearly", "closely",
  "commonly", "constantly", "correctly", "deeply", "directly", "entirely",
  "exactly", "frequently", "gently", "heavily", "immediately", "largely",
  "lightly", "naturally", "necessarily", "normally", "perfectly", "positively",
  "precisely", "properly", "rapidly", "recently", "regularly", "roughly",
  "seriously", "significantly", "slightly", "specifically", "suddenly",
  "surely", "tightly", "totally", "typically", "ultimately", "usually",
  // -tion/-sion nouns
  "action", "attention", "condition", "direction", "education", "information",
  "situation", "position", "question", "section", "station", "addition",
  "application", "association", "collection", "communication", "competition",
  "completion", "connection", "construction", "conversation", "correction",
  "creation", "decision", "description", "destruction", "determination",
  "development", "discussion", "distribution", "election", "examination",
  "expectation", "explanation", "expression", "extension", "foundation",
  "generation", "identification", "impression", "improvement", "inspection",
  "introduction", "investigation", "invitation", "operation", "organization",
  "permission", "population", "possession", "preparation", "presentation",
  "production", "promotion", "protection", "publication", "reaction",
  "recognition", "recommendation", "registration", "regulation", "relationship",
  "reputation", "restriction", "satisfaction", "selection", "suggestion",
  "translation", "transportation", "variation",
  // Common verbs (past tense and other forms)
  "accepted", "achieved", "acted", "added", "addressed", "admitted",
  "affected", "agreed", "allowed", "announced", "answered", "appeared",
  "applied", "approached", "approved", "argued", "arranged", "arrived",
  "asked", "assumed", "attended", "avoided", "based", "became", "become",
  "began", "begun", "behaved", "believed", "belonged", "brought", "built",
  "bought", "broke", "broken", "called", "carried", "caused", "changed",
  "chose", "chosen", "claimed", "closed", "collected", "combined",
  "committed", "compared", "competed", "completed", "concerned", "conducted",
  "confirmed", "connected", "considered", "consisted", "contained",
  "continued", "contributed", "controlled", "convinced", "cooked", "copied",
  "corrected", "cost", "could", "covered", "created", "crossed", "cut",
  "damaged", "dealt", "decided", "declared", "decreased", "defined",
  "delivered", "demanded", "denied", "depended", "described", "designed",
  "destroyed", "determined", "developed", "died", "directed", "disappeared",
  "discovered", "discussed", "displayed", "distributed", "drove", "driven",
  "dropped", "eaten", "edited", "educated", "employed", "enabled",
  "encouraged", "ended", "engaged", "enjoyed", "entered", "established",
  "evaluated", "examined", "existed", "expanded", "expected", "explained",
  "explored", "expressed", "extended", "failed", "fallen", "fascinated",
  "filled", "finalized", "financed", "finished", "fixed", "followed",
  "forced", "formed", "found", "framed", "freed", "gathered", "gave", "given",
  "gone", "governed", "granted", "grew", "grown", "guaranteed", "guided",
  "handled", "happened", "harmed", "hated", "heard", "held", "helped",
  "hidden", "hit", "hoped", "identified", "ignored", "imagined", "impacted",
  "implemented", "implied", "imported", "imposed", "improved", "included",
  "increased", "indicated", "influenced", "informed", "initiated", "injured",
  "inserted", "insisted", "installed", "integrated", "intended", "interested",
  "interpreted", "interrupted", "introduced", "invented", "invested",
  "investigated", "involved", "issued", "joined", "judged", "jumped",
  "justified", "kept", "kicked", "killed", "knocked", "known", "labeled",
  "launched", "lay", "led", "lifted", "lighted", "liked", "limited",
  "linked", "listed", "listened", "lived", "loaded", "located", "locked",
  "looked", "lost", "loved", "lowered", "made", "maintained", "managed",
  "manufactured", "marked", "matched", "meant", "measured", "met",
  "mentioned", "missed", "mixed", "modified", "monitored", "moved",
  "named", "needed", "negotiated", "noted", "noticed", "obtained", "offered",
  "opened", "operated", "ordered", "organized", "owned", "painted",
  "participated", "passed", "perceived", "performed", "permitted", "placed",
  "planned", "played", "pointed", "possessed", "poured", "preceded",
  "preferred", "prepared", "presented", "preserved", "pressed", "prevented",
  "printed", "proceeded", "processed", "produced", "promised", "promoted",
  "proposed", "protected", "proved", "provided", "published", "pulled",
  "purchased", "pushed", "put", "qualified", "questioned", "raised",
  "ran", "reached", "read", "realized", "received", "recognized", "recorded",
  "reduced", "referred", "reflected", "refused", "regarded", "registered",
  "related", "released", "relied", "remained", "removed", "repeated",
  "replaced", "replied", "reported", "represented", "requested", "required",
  "researched", "resolved", "respected", "responded", "restored", "restricted",
  "resulted", "retained", "retired", "returned", "revealed", "reviewed",
  "revised", "rose", "risen", "ran", "satisfied", "saved", "said", "saw",
  "seen", "searched", "secured", "selected", "sold", "sent", "separated",
  "served", "set", "settled", "shaped", "shared", "showed", "shown",
  "signed", "simplified", "spoke", "spoken", "started", "stated",
  "stayed", "stole", "stolen", "stopped", "stored", "struck", "structured",
  "studied", "submitted", "succeeded", "suffered", "suggested", "supplied",
  "supported", "supposed", "surprised", "surrounded", "surveyed",
  "survived", "suspected", "took", "taken", "taught", "told", "tested",
  "thanked", "thought", "threw", "thrown", "touched", "tracked", "traded",
  "trained", "transferred", "transformed", "translated", "transported",
  "treated", "tried", "turned", "understood", "undertook", "undertaken",
  "united", "updated", "upgraded", "used", "utilized", "varied", "verified",
  "viewed", "visited", "volunteered", "waited", "walked", "wanted",
  "warned", "washed", "watched", "wore", "worn", "worked", "worried",
  "wrapped", "wrote", "written",
  // Prepositions
  "about", "above", "across", "after", "against", "along", "among", "around",
  "before", "behind", "below", "beneath", "beside", "between", "beyond",
  "during", "except", "inside", "outside", "past", "since", "through",
  "throughout", "toward", "towards", "underneath", "until", "upon", "within",
  // Common -ing forms
  "going", "coming", "doing", "making", "taking", "giving", "using",
  "working", "living", "playing", "running", "moving", "keeping", "putting",
  "setting", "letting", "getting", "seeing", "knowing", "thinking",
  "feeling", "hearing", "saying", "telling", "finding", "showing",
  "beginning", "writing", "reading", "speaking", "being", "having",
  "looking", "trying", "asking", "needing", "wanting", "calling",
  "following", "including", "providing", "supporting", "allowing",
  "considering", "continuing", "creating", "developing", "ensuring",
  "establishing", "existing", "increasing", "introducing", "managing",
  "offering", "operating", "planning", "preparing", "producing", "receiving",
  "remaining", "requiring", "studying", "turning",
];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function getSpellingSuggestion(word: string): string | null {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean || DICTIONARY.includes(clean) || clean.length <= 1) return null;
  let best: string | null = null;
  let bestDist = Infinity;
  for (const dictWord of DICTIONARY) {
    if (Math.abs(dictWord.length - clean.length) > 3) continue;
    if (dictWord[0] !== clean[0]) continue;
    const dist = levenshtein(clean, dictWord);
    if (dist < bestDist) {
      bestDist = dist;
      best = dictWord;
    }
    if (dist === 1) break;
  }
  return best && bestDist <= 2 ? best : null;
}

const commonPhraseIssues: { pattern: RegExp; message: string; suggestion: string }[] = [
  { pattern: /\btheir is\b/gi, message: "Incorrect phrase", suggestion: "there is" },
  { pattern: /\btheir are\b/gi, message: "Incorrect phrase", suggestion: "there are" },
  { pattern: /\byour welcome\b/gi, message: "Incorrect phrase", suggestion: "you're welcome" },
  { pattern: /\bcould of\b/gi, message: "Incorrect phrase", suggestion: "could have" },
  { pattern: /\bshould of\b/gi, message: "Incorrect phrase", suggestion: "should have" },
  { pattern: /\bwould of\b/gi, message: "Incorrect phrase", suggestion: "would have" },
  { pattern: /\bmust of\b/gi, message: "Incorrect phrase", suggestion: "must have" },
  { pattern: /\bmight of\b/gi, message: "Incorrect phrase", suggestion: "might have" },
  { pattern: /\bmay of\b/gi, message: "Incorrect phrase", suggestion: "may have" },
  { pattern: /\b(?:he|she|it) dont\b/gi, message: "Subject-verb agreement", suggestion: "doesn't" },
  { pattern: /\b(?:they|we|you) doesnt\b/gi, message: "Subject-verb agreement", suggestion: "don't" },
  { pattern: /\b(?:he|she|it) dont\b/gi, message: "Subject-verb agreement", suggestion: "doesn't" },
  { pattern: /\ba (?:apple|hour|honest|honor|heir|herb|umbrella|unicorn[^s]|university\b)/gi, message: "Wrong article - should be 'an'", suggestion: "" },
  { pattern: /\ban (?:university|uniform|unicorn|united|union|unique|universal|usual|useful)/gi, message: "Wrong article - should be 'a'", suggestion: "" },
  { pattern: /\b(?:there|here|where) at\b/gi, message: "Remove extra 'at'", suggestion: "" },
  { pattern: /\b(?:could|should|would)a\b/gi, message: "Missing word", suggestion: "" },
  { pattern: /\ballot\b/gi, message: "Common misspelling (should be two words)", suggestion: "a lot" },
  { pattern: /\banyways\b/gi, message: "Non-standard word", suggestion: "anyway" },
  { pattern: /\beverytime\b/gi, message: "Common misspelling", suggestion: "every time" },
  { pattern: /\bthats\b/gi, message: "Missing apostrophe", suggestion: "that's" },
  { pattern: /\bwhats\b/gi, message: "Missing apostrophe", suggestion: "what's" },
  { pattern: /\b(?:wont|cant|dont|didnt|isnt|wasnt|arent|werent|havent|hasnt|hadnt|couldnt|shouldnt|wouldnt|doesnt|neednt|musnt)\b/gi, message: "Missing apostrophe", suggestion: "" },
  { pattern: /\byoure\b/gi, message: "Missing apostrophe", suggestion: "you're" },
  { pattern: /\bits\s+(?:a|an|not|really|very|quite|still|just|also|only|even|already|always|never|sometimes)/gi, message: "Possible missing apostrophe in 'it's'", suggestion: "" },
  { pattern: /\byour\s+(?:right|wrong|welcome|first|second|last|next|fault|turn|move|call|bet|loss|gain)/gi, message: "Possible 'you're' intended", suggestion: "" },
  { pattern: /\b(?:he|she|it) dont\b/gi, message: "Subject-verb agreement", suggestion: "" },
  { pattern: /\b(?:he|she|it) have\b/gi, message: "Subject-verb agreement - should be 'has'", suggestion: "" },
  { pattern: /\b(?:they|we|you|i) has\b/gi, message: "Subject-verb agreement - should be 'have'", suggestion: "" },
];

function scanText(text: string): Correction[] {
  const issues: Correction[] = [];
  const seen = new Set<string>();

  // Scan phrases
  for (const rule of commonPhraseIssues) {
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      const key = `${match.index}-${match[0].length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let suggestion = rule.suggestion;
      if (!suggestion) suggestion = match[0].replace(/\b(a|an)\b/i, (m: string) => m.toLowerCase() === "a" ? "an" : "a");
      if (!suggestion && rule.message.includes("apostrophe")) {
        suggestion = match[0].replace(/(\w+)nt\b/gi, "$1n't").replace(/\bthats\b/gi, "that's").replace(/\bwhats\b/gi, "what's").replace(/\byoure\b/gi, "you're");
      }
      if (!suggestion && rule.message.includes("there is")) suggestion = "there is";
      if (!suggestion && rule.message.includes("there are")) suggestion = "there are";
      if (!suggestion && rule.message.includes("you're welcome")) suggestion = "you're welcome";
      if (!suggestion && rule.message.includes("could have")) suggestion = "could have";
      if (!suggestion && rule.message.includes("should have")) suggestion = "should have";
      if (!suggestion && rule.message.includes("would have")) suggestion = "would have";
      if (!suggestion && rule.message.includes("must have")) suggestion = "must have";
      if (!suggestion && rule.message.includes("might have")) suggestion = "might have";
      if (!suggestion && rule.message.includes("may have")) suggestion = "may have";
      if (!suggestion && rule.message.includes("doesn't")) suggestion = match[0].replace(/\bdont\b/gi, "doesn't");
      if (!suggestion && rule.message.includes("don't")) suggestion = match[0].replace(/\bdoesnt\b/gi, "don't");
      if (!suggestion && rule.message.includes("anyway")) suggestion = "anyway";
      if (!suggestion && rule.message.includes("every time")) suggestion = "every time";
      if (!suggestion && rule.message.includes("a lot")) suggestion = "a lot";
      issues.push({
        type: rule.message.includes("apostrophe") ? "punctuation" : rule.message.includes("Spelling") ? "spelling" : "grammar",
        message: rule.message,
        suggestion: suggestion || match[0],
        original: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Scan words for spelling
  const wordRegex = /\b[a-zA-Z]{2,}\b/g;
  let wordMatch;
  while ((wordMatch = wordRegex.exec(text)) !== null) {
    const word = wordMatch[0];
    const suggestion = getSpellingSuggestion(word);
    if (suggestion) {
      const key = `${wordMatch.index}-${word.length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        type: "spelling",
        message: `Possible spelling mistake`,
        suggestion: word[0] === word[0].toUpperCase() ? suggestion[0].toUpperCase() + suggestion.slice(1) : suggestion,
        original: word,
        start: wordMatch.index,
        end: wordMatch.index + word.length,
      });
    }
  }

  // Punctuation checks
  if (text.trim() && !/[.!?]$/.test(text.trim())) {
    issues.push({
      type: "punctuation",
      message: "Sentence missing ending punctuation",
      suggestion: text.trim() + ".",
      original: "",
      start: text.length,
      end: text.length,
    });
  }

  issues.sort((a, b) => a.start - b.start);
  return issues;
}

function applyCorrection(text: string, correction: Correction): string {
  if (correction.original) {
    return text.slice(0, correction.start) + correction.suggestion + text.slice(correction.end);
  }
  return text + correction.suggestion;
}

function applyAllCorrections(text: string, corrections: Correction[]): string {
  let result = text;
  let offset = 0;
  for (const c of corrections) {
    const start = c.start + offset;
    const end = c.end + offset;
    const original = c.original || result.slice(start, end);
    result = result.slice(0, start) + c.suggestion + result.slice(end);
    offset += c.suggestion.length - original.length;
  }
  return result;
}

export default function GrammarChecker() {
  const [text, setText] = useState("");
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [correctedText, setCorrectedText] = useState("");
  const [checked, setChecked] = useState(false);

  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text]);
  const charCount = text.length;

  const checkGrammar = () => {
    if (!text.trim()) return;
    const found = scanText(text);
    setCorrections(found);
    setCorrectedText(applyAllCorrections(text, found));
    setChecked(true);
  };

  const applyOne = (index: number) => {
    const c = corrections[index];
    const newText = applyCorrection(text, c);
    setText(newText);
    const newCorrections = [...corrections];
    newCorrections.splice(index, 1);
    setCorrections(newCorrections);
    setCorrectedText(applyAllCorrections(newText, newCorrections));
  };

  const autoCorrect = () => {
    if (!checked) checkGrammar();
    const newText = applyAllCorrections(text, corrections);
    setText(newText);
    setCorrections([]);
    setCorrectedText(newText);
  };

  const clearAll = () => {
    setText("");
    setCorrections([]);
    setCorrectedText("");
    setChecked(false);
  };

  const typeColors: Record<Correction["type"], string> = {
    spelling: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    grammar: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    punctuation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    style: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  const renderDiff = () => {
    if (!checked || !text) return null;
    const parts: { text: string; changed: boolean }[] = [];
    let lastEnd = 0;
    for (const c of corrections) {
      if (c.start > lastEnd) {
        parts.push({ text: text.slice(lastEnd, c.start), changed: false });
      }
      parts.push({ text: text.slice(c.start, c.end), changed: true });
      lastEnd = c.end;
    }
    if (lastEnd < text.length) {
      parts.push({ text: text.slice(lastEnd), changed: false });
    }
    return parts;
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mt-2">Smart Grammar Checker</h1>
        <p className="text-muted-foreground mt-1">
          Detects spelling errors, grammar mistakes, punctuation issues, and suggests auto-corrections for your sentences.
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Your Text</CardTitle>
              <div className="text-sm text-muted-foreground">
                {wordCount} words · {charCount} characters
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setChecked(false);
              }}
              placeholder="Paste or type your text here..."
              className="min-h-[200px] text-base"
            />
            <div className="flex gap-2 flex-wrap">
              <Button onClick={checkGrammar} disabled={!text.trim()}>
                Check Grammar
              </Button>
              <Button onClick={autoCorrect} disabled={!text.trim() || corrections.length === 0}>
                Auto-Correct All
              </Button>
              <Button variant="outline" onClick={clearAll} disabled={!text}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {checked && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  Issues Found
                  {corrections.length > 0 && (
                    <Badge variant="destructive" className="ml-2">{corrections.length} issue{corrections.length > 1 ? "s" : ""}</Badge>
                  )}
                  {corrections.length === 0 && (
                    <Badge className="ml-2 bg-green-100 text-green-800">No issues found</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {corrections.length > 0 ? (
                  <div className="space-y-3">
                    {corrections.map((corr, i) => (
                      <div key={i} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={typeColors[corr.type]}>{corr.type}</Badge>
                          <span className="text-sm font-medium">{corr.message}</span>
                        </div>
                        {corr.original && (
                          <div className="text-sm text-muted-foreground">
                            Original: <span className="line-through text-red-500">{corr.original}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            Suggested: <span className="text-green-600 font-medium">{corr.suggestion}</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => applyOne(i)}>
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">✓</div>
                    <p>No issues detected. Your text looks great!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {corrections.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Corrected Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                    <div className="text-xs text-muted-foreground mb-1">Changes highlighted:</div>
                    {renderDiff()?.map((part, i) => (
                      part.changed
                        ? <span key={i} className="bg-red-200 dark:bg-red-800 line-through rounded px-0.5">{part.text}</span>
                        : <span key={i}>{part.text}</span>
                    ))}
                    {correctedText !== text && (
                      <>
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground mb-1">Corrected version:</div>
                          <div className="text-green-700 dark:text-green-300">{correctedText}</div>
                        </div>
                      </>
                    )}
                  </div>
                  <Button onClick={autoCorrect}>
                    Apply All Corrections
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
