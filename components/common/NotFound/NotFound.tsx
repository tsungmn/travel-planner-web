"use client";

import Link from "next/link";
import { Box, Button, Text, Title } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";

import { BrokenPathIllustration } from "@/components/common/Illustrations";
import classes from "./NotFound.module.css";

export function NotFound() {
  return (
    <Box component="main" className={classes.page}>
      <Box className={classes.content}>
        <BrokenPathIllustration className={classes.illustration} />

        <Title order={1} size="h3" mb={8}>
          페이지를 찾을 수 없어요
        </Title>
        <Text size="sm" c="dimmed" mb="lg" className={classes.description}>
          주소가 잘못되었거나 접근할 수 없는 여행이에요.
        </Text>

        <Button
          component={Link}
          href="/trips"
          leftSection={<IconMapPin size={16} aria-hidden="true" />}
        >
          내 여행으로
        </Button>
      </Box>
    </Box>
  );
}
