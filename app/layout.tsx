import type { Metadata } from "next";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
} from "@mantine/core";
import { theme } from "@/theme";

export const metadata: Metadata = {
  title: "여행길",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider theme={theme}>{children}</MantineProvider>
      </body>
    </html>
  );
}
