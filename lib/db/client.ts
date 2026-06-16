import { createClient } from "@supabase/supabase-js";

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // FIX: placeholder values like "<your-supabase-url-here>" are truthy but invalid,
  // causing createClient to throw at runtime. Treat them as missing.
  const isValidUrl =
    typeof supabaseUrl === "string" &&
    (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"));

  if (!isValidUrl || !supabaseServiceRoleKey) {
    console.warn("[Supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Using fallback client.");
    return createStubClient();
  }

  return createClient<any>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createStubClient(): any {
  const emptyResult = { data: null, error: { message: "Supabase not configured" } };

  const chainable = new Proxy(() => Promise.resolve(emptyResult), {
    get(_target, prop) {
      if (prop === "then") {
        return (onFulfilled: any, onRejected: any) => {
          return Promise.resolve(emptyResult).then(onFulfilled, onRejected);
        };
      }
      return () => chainable;
    },
    apply(_target, _thisArg, args) {
      return Promise.resolve(emptyResult);
    },
  });

  return chainable;
}

let _client: any = null;

function getClient() {
  if (!_client) {
    _client = createSupabaseClient();
  }
  return _client;
}

export const supabase = new Proxy({} as any, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});
