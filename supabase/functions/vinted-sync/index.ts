import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VINTED_CATALOG_URL =
  "https://www.vinted.es/api/v2/catalog/items?order=newest_first&price_to=100&per_page=20&catalog_ids=1206,5,1193&status_ids=6";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { cookie } = await req.json();
    if (!cookie || typeof cookie !== "string" || cookie.trim().length < 10) {
      return json(
        { error: "Cookie de sesion no proporcionada o invalida." },
        400,
      );
    }

    const vintedRes = await fetch(VINTED_CATALOG_URL, {
      headers: {
        Cookie: `_vinted_fr_session=${cookie.trim()}`,
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
      },
    });

    if (!vintedRes.ok) {
      const status = vintedRes.status;
      if (status === 401 || status === 403) {
        return json(
          {
            error:
              "Cookie caducada o invalida. Renueva tu cookie en la seccion de Administrador.",
          },
          401,
        );
      }
      return json(
        { error: `Vinted respondio con estado ${status}. Intentalo mas tarde.` },
        502,
      );
    }

    const body = await vintedRes.json();
    const items = body?.items;

    if (!Array.isArray(items) || items.length === 0) {
      return json({ articles: [], message: "No se encontraron articulos." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const articles = items.map((item: Record<string, unknown>) => {
      const photo = item.photo as Record<string, unknown> | null;
      const price = item.price as string | null;
      const priceNum = parseFloat(price ?? "0");
      const user = item.user as Record<string, unknown> | null;
      const brand = (item.brand_title as string) ?? "";
      const size = (item.size_title as string) ?? "";
      const url = item.url as string;
      const fullUrl = url?.startsWith("http")
        ? url
        : `https://www.vinted.es${url ?? ""}`;

      return {
        name: (item.title as string) ?? "Sin titulo",
        brand,
        avg_sale_price: priceNum,
        estimated_margin: 0,
        velocity_score: 50,
        trend: "stable",
        notes: user
          ? `Vendedor: ${(user as Record<string, unknown>).login ?? "?"}`
          : "",
        image_url: (photo as Record<string, unknown>)?.url as string ?? "",
        size,
        sale_time_minutes: 0,
        description: (item.description as string) ?? "",
        vinted_url: fullUrl,
      };
    });

    const existingResult = await sb
      .from("winning_articles")
      .select("vinted_url");
    const existingUrls = new Set(
      (existingResult.data ?? []).map(
        (r: { vinted_url: string }) => r.vinted_url,
      ),
    );

    const newArticles = articles.filter(
      (a: { vinted_url: string }) => a.vinted_url && !existingUrls.has(a.vinted_url),
    );

    if (newArticles.length === 0) {
      return json({
        articles: [],
        message:
          "Sincronizado correctamente. No se encontraron articulos nuevos.",
      });
    }

    const insertResult = await sb
      .from("winning_articles")
      .insert(newArticles)
      .select(
        "id, name, brand, avg_sale_price, estimated_margin, velocity_score, trend, notes, image_url, size, sale_time_minutes, description, vinted_url, created_at",
      );

    if (insertResult.error) {
      return json(
        { error: `Error al guardar: ${insertResult.error.message}` },
        500,
      );
    }

    return json({
      articles: insertResult.data ?? [],
      message: `Se importaron ${newArticles.length} articulo(s) desde Vinted.`,
    });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
