import Link from "next/link";
import { Box, Button, Text, UnstyledButton } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";

import classes from "./ShareTopBar.module.css";

/** 로그인하지 않은 방문자용 상단바. 로고와 "나도 일정 만들기"만 둡니다. */
export function ShareTopBar() {
  return (
    <Box component="header" className={classes.header}>
      <Box className={classes.inner}>
        <UnstyledButton
          component={Link}
          href="/"
          className={classes.logo}
          aria-label="여행길 홈으로 이동"
        >
          <IconMapPin size={24} stroke={2.2} aria-hidden="true" />
          <Text component="span" fw={700} size="lg">
            여행길
          </Text>
        </UnstyledButton>
        <Button
          component={Link}
          href="/login"
          variant="default"
          size="compact-md"
        >
          나도 일정 만들기
        </Button>
      </Box>
    </Box>
  );
}
