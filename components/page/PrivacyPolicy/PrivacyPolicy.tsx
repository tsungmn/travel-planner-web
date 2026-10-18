import Link from "next/link";

import {
  LegalLayout,
  type LegalSection,
} from "@/components/common/LegalLayout";

const sections: LegalSection[] = [
  {
    id: "collect",
    title: "1. 수집하는 정보",
    content: (
      <ul>
        <li>
          <strong>이메일 주소</strong> — 계정 생성 및 로그인에 사용됩니다.
        </li>
        <li>
          <strong>이름</strong> — 선택적으로 제공할 수 있습니다.
        </li>
        <li>
          <strong>비밀번호</strong> — 이메일로 가입하는 경우 입력하며, 복원할 수
          없는 방식(Argon2 해시)으로 변환하여 저장합니다. 원문은 저장하지
          않습니다.
        </li>
        <li>
          <strong>Google 계정 식별자</strong> — Google 로그인 시 제공됩니다.
        </li>
        <li>
          <strong>여행 데이터</strong> — 여행 제목, 장소, 항공편 정보, 숙소
          정보, 장소 메모가 저장됩니다.
        </li>
        <li>
          <strong>로그인 세션 쿠키</strong> — 로그인 상태를 유지하기 위해
          사용됩니다.
        </li>
        <li>
          <strong>접속 기록</strong> — 서비스 이용 시 IP 주소, 접속 시각, 요청
          주소, 브라우저 정보가 웹 서버에 자동으로 기록됩니다.
        </li>
        <li>
          <strong>계정 삭제 사유</strong> — 계정을 삭제할 때 선택한 사유와
          자유롭게 적은 의견입니다. 계정 정보와 연결하지 않고 익명으로
          보관합니다.
        </li>
      </ul>
    ),
  },
  {
    id: "purpose",
    title: "2. 이용 목적",
    content: (
      <p>
        수집된 정보는 여행 일정의 작성·저장·공유, 지도 및 장소 검색 기능의 제공,
        계정 관리, 보안 및 장애 대응, 서비스 개선을 위해 사용됩니다. 수집 목적
        외의 용도로는 사용되지 않습니다.
      </p>
    ),
  },
  {
    id: "retention",
    title: "3. 보관 및 파기",
    content: (
      <>
        <ul>
          <li>
            <strong>계정 정보와 여행 데이터</strong> — 계정을 유지하는 동안
            보관합니다.
          </li>
          <li>
            <strong>계정 삭제</strong> — 서비스의{" "}
            <Link href="/account/delete">계정 삭제</Link> 메뉴에서 직접 삭제할
            수 있으며, 삭제하면 계정 정보와 여행 데이터가 즉시 파기됩니다.
          </li>
          <li>
            <strong>백업</strong> — 장애 복구를 위해 백업본을 둘 수 있으며,
            백업에 남은 데이터는 삭제 후 최대 30일 이내에 파기됩니다.
          </li>
          <li>
            <strong>접속 기록</strong> — 보안 및 장애 대응을 위해 최대 14일간
            보관한 뒤 파기합니다.
          </li>
          <li>
            <strong>계정 삭제 사유</strong> — 계정과 연결되지 않은 익명 정보로서
            서비스 개선을 위해 보관합니다.
          </li>
        </ul>
        <p>
          법령에 따라 보존 의무가 있는 정보가 있는 경우, 해당 기간 동안 보관 후
          파기합니다.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "4. 제3자 제공 및 처리",
    content: (
      <>
        <p>
          서비스 제공을 위해 다음과 같이 제3자에게 정보가 전달될 수 있습니다.
        </p>
        <ul>
          <li>
            <strong>Geoapify</strong> — 장소 검색 시 입력한 검색어가 Geoapify
            검색 API로 전달되어 장소 결과를 가져옵니다.
          </li>
          <li>
            <strong>OpenStreetMap Nominatim</strong> — 주소 검색 및 변환 시
            검색어가 Nominatim 서비스로 전달됩니다.
          </li>
          <li>
            <strong>OpenFreeMap</strong> — 지도를 표시하기 위해 지도 타일을
            내려받을 때, 이용자의 브라우저에서 해당 서버로 직접 요청이 전달되며
            IP 주소와 브라우저 정보가 노출됩니다.
          </li>
          <li>
            <strong>Google</strong> — Google 로그인을 이용하는 경우 인증을 위해
            Google을 거치며, 이메일·이름·계정 식별자를 전달받습니다.
          </li>
          <li>
            <strong>Cloudflare</strong> — 도메인(DNS)을 Cloudflare를 통해
            관리하며, 프록시를 사용하는 경우 접속 트래픽이 Cloudflare를 경유할
            수 있습니다.
          </li>
        </ul>
        <p>
          위 제공자의 서버는 해외에 있을 수 있어, 해당 정보가 국외에서 처리될 수
          있습니다. 이 외에 개인정보를 제3자에게 제공하는 경우는 없습니다. 장소
          검색 시 전달되는 것은 이용자가 입력한 검색어이며, 계정 정보는 전달되지
          않습니다.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "5. 쿠키 사용",
    content: (
      <>
        <p>
          서비스는 로그인 세션을 유지하기 위해 쿠키를 사용합니다. 쿠키에는 인증
          세션 정보만 저장되며, 추적이나 광고 목적의 쿠키는 사용하지 않습니다.
        </p>
        <p>
          브라우저 설정에서 쿠키를 차단할 수 있으나, 이 경우 로그인 기능이
          정상적으로 작동하지 않을 수 있습니다.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "6. 안전성 확보 조치",
    content: (
      <ul>
        <li>비밀번호는 복원할 수 없는 해시로 변환하여 저장합니다.</li>
        <li>
          로그인 세션 토큰은 해시 값만 저장하며, 쿠키는 스크립트에서 접근할 수
          없도록 설정합니다.
        </li>
        <li>이용자와 서비스 사이의 통신은 HTTPS로 암호화합니다.</li>
        <li>개인정보에 접근할 수 있는 사람을 운영자로 제한합니다.</li>
      </ul>
    ),
  },
  {
    id: "rights",
    title: "7. 이용자의 권리",
    content: (
      <ul>
        <li>
          개인정보의 <strong>열람</strong>을 요청할 수 있습니다.
        </li>
        <li>
          부정확한 정보의 <strong>정정</strong>을 요청할 수 있습니다.
        </li>
        <li>
          저장된 개인정보 및 여행 데이터의 <strong>삭제</strong>를 요청할 수
          있습니다.
        </li>
        <li>
          <Link href="/account/delete">계정 삭제</Link> 메뉴에서 언제든지{" "}
          <strong>계정을 삭제</strong>할 수 있으며, 삭제 시 모든 데이터가
          파기됩니다.
        </li>
      </ul>
    ),
  },
  {
    id: "children",
    title: "8. 아동의 개인정보",
    content: (
      <p>
        서비스는 만 14세 이상만 이용할 수 있으며, 만 14세 미만 아동의 개인정보는
        수집하지 않습니다. 만 14세 미만의 이용이 확인되면 해당 계정과 데이터를
        지체 없이 삭제합니다.
      </p>
    ),
  },
  {
    id: "contact",
    title: "9. 개인정보 보호책임자 및 문의처",
    content: (
      <>
        <p>
          개인정보 처리에 관한 문의, 열람·정정·삭제 요청은 아래로 보내 주시면
          됩니다.
        </p>
        <ul>
          <li>
            개인정보 보호책임자: <strong>여행길 운영자</strong>
          </li>
          <li>
            이메일: <strong>admin@tsungmn.com</strong>
          </li>
          <li>
            사업자명: <strong>여행길</strong>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "amendments",
    title: "10. 방침 변경",
    content: (
      <p>
        본 방침은 법령이나 서비스 운영의 변경에 따라 바뀔 수 있습니다. 변경 시
        본 페이지에 게시하며, 중대한 변경은 서비스 내 공지를 통해 안내합니다.
        변경 내용은 상단의 시행일부터 적용됩니다.
      </p>
    ),
  },
];

export function PrivacyPolicy() {
  return (
    <LegalLayout type="privacy" title="개인정보처리방침" sections={sections} />
  );
}
