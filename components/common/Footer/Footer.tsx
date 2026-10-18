import Link from "next/link";
import { Box, Container, Group, Text } from "@mantine/core";

import classes from "./Footer.module.css";

export function Footer() {
  return (
    <Box component="footer" className={classes.footer}>
      <Container size="lg" className={classes.inner}>
        <Text component="span" size="xs" c="dimmed" fw={500}>
          여행길
        </Text>
        <Group gap="md" className={classes.links}>
          <Link href="/terms" className={classes.link}>
            이용약관
          </Link>
          <Link href="/privacy" className={classes.link}>
            개인정보처리방침
          </Link>
          <Link href="/account/delete" className={classes.dangerLink}>
            계정 삭제
          </Link>
        </Group>
      </Container>
    </Box>
  );
}
