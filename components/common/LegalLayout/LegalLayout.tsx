"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Collapse,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconMapPin,
  IconShield,
} from "@tabler/icons-react";

import { LEGAL_EFFECTIVE_DATE } from "@/constants/legal";
import classes from "./LegalLayout.module.css";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalLayoutProps {
  type: "privacy" | "terms";
  title: string;
  sections: LegalSection[];
}

const PAGE_META = {
  privacy: {
    icon: IconShield,
    other: { href: "/terms", label: "이용약관" },
  },
  terms: {
    icon: IconFileText,
    other: { href: "/privacy", label: "개인정보처리방침" },
  },
} as const;

export function LegalLayout({ type, title, sections }: LegalLayoutProps) {
  const [tocOpened, { toggle: toggleToc, close: closeToc }] =
    useDisclosure(false);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  const { icon: Icon, other } = PAGE_META[type];

  // 화면 상단에 가장 가까운 섹션을 목차에서 강조합니다.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );

    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [sections]);

  const handleTocClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    const element = document.getElementById(id);
    if (!element) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    element.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", `#${id}`);
    setActiveId(id);
    closeToc();
  };

  const tocLinks = sections.map((section) => (
    <a
      key={section.id}
      href={`#${section.id}`}
      className={classes.tocLink}
      data-active={activeId === section.id || undefined}
      aria-current={activeId === section.id ? "location" : undefined}
      onClick={(event) => handleTocClick(event, section.id)}
    >
      {section.title}
    </a>
  ));

  return (
    <Box className={classes.page}>
      <Box component="header" className={classes.header}>
        <Box className={classes.headerInner}>
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
          <Link href="/login" className={classes.headerLink}>
            로그인
          </Link>
        </Box>
      </Box>

      <Box className={classes.notice}>
        <Box className={classes.noticeInner}>
          <Badge variant="light" color="yellow" size="sm">
            초안
          </Badge>
          <Text component="span" size="xs">
            법적 검토 전의 초안 문서입니다. 최종 확정 후 시행됩니다.
          </Text>
        </Box>
      </Box>

      <Box className={classes.body}>
        <Box component="aside" className={classes.sidebar}>
          <Box component="nav" aria-label="목차" className={classes.toc}>
            <Text className={classes.tocTitle}>목차</Text>
            {tocLinks}
          </Box>
        </Box>

        <Box component="main" className={classes.main}>
          <Box className={classes.titleRow}>
            <Icon size={24} className={classes.titleIcon} aria-hidden="true" />
            <Title order={1} size="h2">
              {title}
            </Title>
          </Box>

          <Box className={classes.mobileToc}>
            <UnstyledButton
              className={classes.mobileTocTrigger}
              onClick={toggleToc}
              aria-expanded={tocOpened}
            >
              목차
              <IconChevronDown
                size={16}
                className={classes.mobileTocChevron}
                data-opened={tocOpened || undefined}
                aria-hidden="true"
              />
            </UnstyledButton>
            <Collapse expanded={tocOpened}>
              <Box component="nav" aria-label="목차" className={classes.toc}>
                {tocLinks}
              </Box>
            </Collapse>
          </Box>

          <Box className={classes.sections}>
            {sections.map((section) => (
              <Box
                component="section"
                key={section.id}
                id={section.id}
                className={classes.section}
              >
                <Title order={2} size="h4" mb="sm">
                  {section.title}
                </Title>
                <Box className={classes.content}>{section.content}</Box>
              </Box>
            ))}
          </Box>

          <Box className={classes.meta}>
            <Text size="xs" c="dimmed" mb="sm">
              시행일: {LEGAL_EFFECTIVE_DATE}
            </Text>
            <Link href={other.href} className={classes.crossLink}>
              {other.label} 보기
              <IconChevronRight size={16} aria-hidden="true" />
            </Link>
          </Box>
        </Box>
      </Box>

      <Box component="footer" className={classes.footer}>
        <Box className={classes.footerInner}>
          <Text component="span" size="xs" c="dimmed">
            여행길
          </Text>
          <Box className={classes.footerLinks}>
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/terms">이용약관</Link>
            <Link href="/login">로그인</Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
