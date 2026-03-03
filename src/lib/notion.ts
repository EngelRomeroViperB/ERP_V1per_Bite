import { Client } from "@notionhq/client";

/**
 * Creates a Notion client using a user's access token (obtained via OAuth).
 */
export function createNotionClient(accessToken: string): Client {
  return new Client({ auth: accessToken });
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

  const response = await fetch("https://api.notion.com/v1/oauth/token", {
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
  const notion = createNotionClient(accessToken);
  const response = await notion.search({
    filter: { value: "database", property: "object" },
    page_size: 50,
  });
  return response.results;
}

/**
 * Creates a page in a Notion database with the given properties.
 */
export async function createNotionPage(
  accessToken: string,
  databaseId: string,
  properties: Record<string, unknown>
) {
  const notion = createNotionClient(accessToken);
  return notion.pages.create({
    parent: { database_id: databaseId },
    properties: properties as Parameters<typeof notion.pages.create>[0]["properties"],
  });
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
  const notion = createNotionClient(accessToken);
  return notion.databases.query({
    database_id: databaseId,
    filter: filter as Parameters<typeof notion.databases.query>[0]["filter"],
    sorts: sorts as Parameters<typeof notion.databases.query>[0]["sorts"],
    page_size: pageSize,
  });
}

/**
 * Retrieves the schema (properties) of a Notion database.
 */
export async function getDatabaseSchema(accessToken: string, databaseId: string) {
  const notion = createNotionClient(accessToken);
  const db = await notion.databases.retrieve({ database_id: databaseId });
  return db;
}
