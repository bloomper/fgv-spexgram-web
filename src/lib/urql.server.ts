import "server-only";

import { cacheExchange, createClient, fetchExchange } from "@urql/core";
import { registerUrql } from "@urql/next/rsc";
import { getAccessToken } from "@/utils/auth.server";
import { authExchange } from "@urql/exchange-auth";
import { getLocale } from "next-intl/server";
import { headers as requestHeaders } from "next/headers";
import { clientIp } from "@/lib/http/client-ip";

const makeClient = () => {
  return createClient({
    url: process.env.API_GRAPHQL_ENDPOINT || "",
    exchanges: [
      cacheExchange,
      authExchange(async (utils) => {
        let token: string | null = null;

        return {
          addAuthToOperation(operation) {
            if (!token) {
              return operation;
            }

            return utils.appendHeaders(operation, {
              Authorization: `Bearer ${token}`,
            });
          },

          didAuthError(error) {
            return error.graphQLErrors.some(
              (e) =>
                e.extensions?.code === "UNAUTHENTICATED" ||
                e.extensions?.code === "UNAUTHORIZED",
            );
          },

          async refreshAuth() {
            token = await getAccessToken();
          },

          willAuthError() {
            return !token;
          },
        };
      }),
      fetchExchange,
    ],
    async fetch(input, init) {
      const locale = await getLocale();
      const headers = new Headers(init?.headers);
      const client = clientIp(await requestHeaders());

      headers.set("Accept-Language", locale);
      // The visitor's address, which the server uses only to limit visitors' reports. The API is public, so it
      // trusts the address only together with the secret it shares with the web
      const secret = process.env.API_CLIENT_IP_SECRET;
      if (client && secret) {
        headers.set("X-Client-IP", client);
        headers.set("X-Client-IP-Secret", secret);
      }

      return fetch(input, {
        ...init,
        headers,
      });
    },
    preferGetMethod: false,
  });
};

export const { getClient } = registerUrql(makeClient);
