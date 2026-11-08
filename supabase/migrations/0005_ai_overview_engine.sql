-- Allow Google AI Overviews (via DataForSEO) in weekly tracker runs.
alter table public.tracker_runs drop constraint if exists tracker_runs_engine_check;
alter table public.tracker_runs
  add constraint tracker_runs_engine_check
  check (engine in ('chatgpt', 'gemini', 'perplexity', 'claude', 'ollama', 'ai_overview'));
