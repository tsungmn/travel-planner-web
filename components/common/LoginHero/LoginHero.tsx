import { IconMapPin } from "@tabler/icons-react";
import { Box, Group, Text, Title } from "@mantine/core";

import classes from "./LoginHero.module.css";

export function LoginHero() {
  return (
    <div className={classes.hero}>
      <div className={classes.background} />

      <svg
        className={classes.topographicGrid}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 800 800"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="topo"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 20 Q10 10 20 20 T40 20"
              stroke="#0F766E"
              strokeWidth="1"
            />
            <path
              d="M0 30 Q10 20 20 30 T40 30"
              stroke="#0F766E"
              strokeWidth="1"
            />
            <path
              d="M0 10 Q10 0 20 10 T40 10"
              stroke="#0F766E"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="800" height="800" fill="url(#topo)" />
      </svg>

      <Box className={classes.copy}>
        <Group className={classes.brand} gap="xs">
          <IconMapPin size={28} stroke={2.2} aria-hidden="true" />
          <Text component="span" fw={700} size="lg">
            여행길
          </Text>
        </Group>
        <Title order={2} className={classes.title}>
          여행 일정, 지도 위에서 한눈에
        </Title>
        <Text className={classes.description} size="sm">
          일차별 동선을 지도에 그리고, 친구와 공유해요.
        </Text>
      </Box>
    </div>
  );
}
