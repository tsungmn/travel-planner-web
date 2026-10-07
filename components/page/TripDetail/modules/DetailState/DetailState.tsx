import { Header } from "@/components/common/Header";
import {
  Box,
  Skeleton,
  Center,
  Stack,
  ThemeIcon,
  Title,
  Text,
} from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import { ReactNode } from "react";
import classes from "./DetailState.module.css";

export function DetailLoading() {
  return (
    <Box className={classes.page}>
      <Header />
      <Box className={classes.loading}>
        <Skeleton height="100%" />
        <Skeleton height="100%" />
      </Box>
    </Box>
  );
}

export function DetailMessage({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action: ReactNode;
}) {
  return (
    <Box className={classes.page}>
      <Header />
      <Center className={classes.message}>
        <Stack align="center">
          <ThemeIcon size={56} radius="xl" color="teal" variant="light">
            {icon ?? <IconMapPin size={30} />}
          </ThemeIcon>
          <Title order={2} size="h4">
            {title}
          </Title>
          {description && (
            <Text c="dimmed" size="sm">
              {description}
            </Text>
          )}
          {action}
        </Stack>
      </Center>
    </Box>
  );
}
