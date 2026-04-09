import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient());
const TABLE_NAME = process.env.TABLE_NAME;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const VALID_LOCALES = ["en", "he", "ru"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function corsOrigin(requestOrigin) {
  if (ALLOWED_ORIGINS.length === 0) return "*";
  return ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0];
}

function response(statusCode, body, origin) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsOrigin(origin),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
  };
}

function trimStr(val) {
  return typeof val === "string" ? val.trim() : "";
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler = async (event) => {
  const origin = event.headers?.origin || "";
  const method = event.requestContext?.http?.method;

  // Preflight
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: response(204, null, origin).headers };
  }

  // Only POST allowed
  if (method !== "POST") {
    return response(405, { error: "Method not allowed" }, origin);
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // Required fields
    const name = trimStr(body.name);
    const phone = trimStr(body.phone);

    if (!name) {
      return response(400, { error: "name is required" }, origin);
    }
    if (!phone) {
      return response(400, { error: "phone is required" }, origin);
    }

    // Optional fields
    const message = trimStr(body.message);
    const locale = VALID_LOCALES.includes(body.locale) ? body.locale : "unknown";
    const source = trimStr(body.source) || "landing";

    const item = {
      id: randomUUID(),
      name,
      phone,
      message,
      locale,
      source,
      createdAt: new Date().toISOString(),
    };

    await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

    return response(200, { success: true, id: item.id }, origin);
  } catch (err) {
    // Bad JSON
    if (err instanceof SyntaxError) {
      return response(400, { error: "Invalid JSON body" }, origin);
    }
    console.error("Lead submission error:", err);
    return response(500, { error: "Internal server error" }, origin);
  }
};
