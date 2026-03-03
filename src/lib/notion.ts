/* eslint-disable @typescript-eslint/no-explicit-any */

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function notionHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

/**
 * Notion OAuth configuration from environment variables.
 */
export function getNotionOAuthConfig() {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Notion OAuth env vars (NOTION_CLIENT_ID, NOTION_CLIENT_SECRET, NOTION_REDIRECT_URI)");
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Builds the Notion OAuth authorization URL.
 */
export function getNotionAuthUrl(): string {
  const { clientId, redirectUri } = getNotionOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}

/**
 * Exchanges an OAuth authorization code for an access token.
 */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  workspace_id: string;
  workspace_name: string;
  bot_id: string;
}> {
  const { clientId, clientSecret, redirectUri } = getNotionOAuthConfig();

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${NOTION_API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion OAuth token exchange failed: ${error}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    workspace_id: data.workspace_id,
    workspace_name: data.workspace_name ?? "",
    bot_id: data.bot_id,
  };
}

/**
 * Searches for all databases the integration has access to.
 */
export async function listDatabases(accessToken: string) {
  const response = await fetch(`${NOTION_API}/search`, {
    method: "POST",
    headers: notionHeaders(accessToken),
    body: JSON.stringify({
      filter: { value: "database", property: "object" },
      page_size: 50,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Notion search failed: ${err}`);
  }

  const data = await response.json();
  return data.results as any[];
}

/**
 * Creates a page in a Notion database with the given properties.
 */
export async function createNotionPage(
  accessToken: string,
  databaseId: string,
  properties: Record<string, unknown>
) {
  const response = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: notionHeaders(accessToken),
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Notion create page failed: ${err}`);
  }

  return response.json();
}

/**
 * Queries pages from a Notion database with optional filter and sorts.
 */
export async function queryNotionDatabase(
  accessToken: string,
  databaseId: string,
  filter?: Record<string, unknown>,
  sorts?: Array<{ property: string; direction: "ascending" | "descending" }>,
  pageSize = 20
) {
  const body: Record<string, unknown> = { page_size: pageSize };
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;

  const response = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
    method: "POST",
    headers: notionHeaders(accessToken),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Notion query failed: ${err}`);
  }

  return response.json();
}

/**
 * Retrieves the schema (properties) of a Notion database.
 */
export async function getDatabaseSchema(accessToken: string, databaseId: string) {
  const response = await fetch(`${NOTION_API}/databases/${databaseId}`, {
    method: "GET",
    headers: notionHeaders(accessToken),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Notion get database failed: ${err}`);
  }

  return response.json();
}
