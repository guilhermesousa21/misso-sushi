import { NextResponse } from "next/server";
import { isAdminSessionValid } from "../../../../lib/adminSession";
import { normalizeCategorySlug } from "../../../../lib/menuCategories";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const missingMenuCategoriesMessage =
  "A tabela public.menu_categories ainda nao existe no Supabase. Rode o arquivo supabase-menu-categories-fix.sql no SQL Editor e tente novamente.";

const isMissingMenuCategoriesTable = (error: { code?: string; message?: string } | null) =>
  Boolean(
    error &&
      (error.code === "PGRST205" ||
        error.message?.includes("public.menu_categories") ||
        error.message?.includes("menu_categories"))
  );

export async function POST(request: Request) {
  if (!(await isAdminSessionValid())) {
    return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisicao invalido." }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const slug = normalizeCategorySlug(name);

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Informe um nome valido para a categoria." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: existing, error: existingError } = await supabase
      .from("menu_categories")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (isMissingMenuCategoriesTable(existingError)) {
      return NextResponse.json({ error: missingMenuCategoriesMessage }, { status: 503 });
    }

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message || "Nao foi possivel criar a categoria." },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({ error: "Essa categoria ja existe." }, { status: 409 });
    }

    const { data: lastCategory, error: lastCategoryError } = await supabase
      .from("menu_categories")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (isMissingMenuCategoriesTable(lastCategoryError)) {
      return NextResponse.json({ error: missingMenuCategoriesMessage }, { status: 503 });
    }

    if (lastCategoryError) {
      return NextResponse.json(
        { error: lastCategoryError.message || "Nao foi possivel criar a categoria." },
        { status: 500 }
      );
    }

    const sort_order =
      typeof lastCategory?.sort_order === "number" ? lastCategory.sort_order + 1 : 0;

    const payload = {
      slug,
      name,
      sort_order,
      active: true,
    };

    const { data, error } = await supabase
      .from("menu_categories")
      .insert(payload)
      .select("id,slug,name,sort_order,active")
      .maybeSingle();

    if (isMissingMenuCategoriesTable(error)) {
      return NextResponse.json({ error: missingMenuCategoriesMessage }, { status: 503 });
    }

    if (error) {
      return NextResponse.json(
        { error: error.message || "Nao foi possivel criar a categoria." },
        { status: 500 }
      );
    }

    return NextResponse.json({ category: data ?? payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel criar a categoria.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
