"use client";

import Link from "next/link";
import { Box, Button, Group, Text, Title } from "@mantine/core";
import { IconMapPin, IconRotate } from "@tabler/icons-react";

import { AlertIllustration } from "@/components/common/Illustrations";
import classes from "./ErrorFallback.module.css";

interface ErrorFallbackProps {
  onRetry?: () => void;
}

export function ErrorFallback({ onRetry }: ErrorFallbackProps) {
  return (
    <Box component="main" className={classes.page}>
      <Box className={classes.content}>
        <AlertIllustration className={classes.illustration} />

        <Title order={1} size="h3" mb={8}>
          문제가 생겼어요
        </Title>
        <Text size="sm" c="dimmed" mb="lg" className={classes.description}>
          잠시 후 다시 시도해 주세요.
        </Text>

        <Group gap="sm" justify="center">
          <Button
            variant="default"
            onClick={onRetry}
            leftSection={<IconRotate size={16} aria-hidden="true" />}
          >
            다시 시도
          </Button>
          <Button
            component={Link}
            href="/trips"
            leftSection={<IconMapPin size={16} aria-hidden="true" />}
          >
            내 여행으로
          </Button>
        </Group>
      </Box>
    </Box>
  );
}
