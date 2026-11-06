"use client";

import * as React from "react";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowUp, CornerDownRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchSpexAction } from "@/app/(app)/manage/actions.server";

export type PickedSpex = {
  id: string;
  title?: string | null;
  year?: number | null;
  revival?: boolean | null;
  parentId?: string | null;
  categoryName?: string | null;
};

/**
 * Picks the spex something is about from Spexregister, the main one first, or none at all. Search results show each
 * original with its revivals indented under it.
 */
export function SpexPicker({ value, onChange, none, onNoneChange }: {
  value: PickedSpex[];
  onChange: (spex: PickedSpex[]) => void;
  /** Whether it is deliberately not about any spex. */
  none: boolean;
  onNoneChange: (none: boolean) => void;
}) {
  const t = useTranslations("SpexPicker");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedSpex[]>([]);
  const [searching, startSearch] = useTransition();
  const picked = new Set(value.map(spex => spex.id));

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }

    const timer = setTimeout(() => startSearch(async () => {
      const result = await searchSpexAction(query);

      if (result.ok) {
        setResults(result.data);
      } else {
        toast.error(result.message);
      }
    }), 300);

    return () => clearTimeout(timer);
  }, [query]);

  const add = (spex: PickedSpex) => {
    onChange([...value, spex]);
    setResults([]);
    setQuery("");
  };
  const remove = (id: string) => onChange(value.filter(spex => spex.id !== id));
  const makeMain = (id: string) => onChange([...value.filter(spex => spex.id === id), ...value.filter(spex => spex.id !== id)]);
  const isGrouped = (spex: PickedSpex) => spex.revival && results.some(other => other.id === spex.parentId);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t("spex")}</legend>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={none} onCheckedChange={checked => {
          onNoneChange(checked === true);
          if (checked === true) {
            onChange([]);
          }
        }} />
        {t("none")}
      </label>
      {none ? <p className="text-xs text-muted-foreground">{t("noneHint")}</p> : (
        <>
          {value.length > 0 && (
            <ol aria-label={t("picked")} className="divide-y rounded-md border">
              {value.map((spex, index) => (
                <li key={spex.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                                    <span className="flex flex-wrap items-center gap-1.5">
                                        <SpexName spex={spex} revival={t("revival")} />
                                      {index === 0 && value.length > 1 &&
                                        <Badge variant="secondary">{t("main")}</Badge>}
                                    </span>
                  <span className="flex gap-1">
                                        {index > 0 && (
                                          <Button type="button" variant="ghost" size="sm"
                                                  onClick={() => makeMain(spex.id)}
                                                  aria-label={t("makeMainOf", { title: describe(spex) })}
                                                  title={t("makeMain")}>
                                            <ArrowUp />
                                          </Button>
                                        )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(spex.id)}
                            aria-label={t("removeOf", { title: describe(spex) })} title={t("remove")}>
                                            <X />
                                        </Button>
                                    </span>
                </li>
              ))}
            </ol>
          )}
          <div className="space-y-1">
            <Label htmlFor="spex-search" className="sr-only">{value.length ? t("searchMore") : t("search")}</Label>
            <Input id="spex-search" value={query} placeholder={value.length ? t("searchMore") : t("search")}
                   onChange={event => setQuery(event.target.value)} />
            <p className="text-xs text-muted-foreground">
              {searching ? t("searching") : value.length > 1 ? t("mainHint") : t("hint")}
            </p>
            {results.length > 0 && query.trim().length >= 2 && (
              <ul aria-label={t("results")} className="max-h-72 divide-y overflow-y-auto rounded-md border">
                {results.map(item => (
                  <li key={item.id}>
                    <button type="button" disabled={picked.has(item.id)}
                            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent"
                            onClick={() => add(item)}>
                      {isGrouped(item) &&
                        <CornerDownRight className="ml-2 size-3.5 shrink-0 text-muted-foreground" aria-hidden />}
                      <SpexName spex={item} revival={t("revival")} />
                      {picked.has(item.id) &&
                        <span className="text-xs text-muted-foreground">({t("alreadyPicked")})</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </fieldset>
  );
}

function describe(spex: PickedSpex) {
  return [spex.title, spex.year].filter(Boolean).join(" ");
}

function SpexName({ spex, revival }: { spex: PickedSpex; revival: string }) {
  return (
    <span>
            {describe(spex)}
      {spex.revival && <span className="text-muted-foreground"> ({revival.toLowerCase()})</span>}
      {spex.categoryName && <span className="text-muted-foreground"> · {spex.categoryName}</span>}
        </span>
  );
}
