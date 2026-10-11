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
      </ul>
    ),
  },
  {
    id: "purpose",
    title: "2. 이용 목적",
    content: (
      <p>
        수집된 정보는 여행 일정의 작성·저장·공유, 지도 및 장소 검색 기능의 제공,
        계정 관리 및 서비스 개선을 위해 사용됩니다. 수집 목적 외의 용도로는
        사용되지 않습니다.
      </p>
    ),
  },
  {
    id: "retention",
    title: "3. 보관 및 파기",
    content: (
      <>
        <p>
          여행 데이터와 계정 정보는 이용자가 계정을 유지하는 동안 보관됩니다.
          계정 삭제 요청 시, 관련된 모든 개인정보와 여행 데이터는 지체 없이
          파기됩니다.
        </p>
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
        </ul>
        <p>
          이 외에 개인정보를 제3자에게 제공하는 경우는 없습니다. 검색 시
          전달되는 것은 이용자가 입력한 검색어이며, 계정 정보는 전달되지
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
    id: "rights",
    title: "6. 이용자의 권리",
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
          <strong>계정 삭제</strong>를 요청할 수 있으며, 삭제 시 모든 데이터가
          파기됩니다.
        </li>
      </ul>
    ),
  },
  {
    id: "contact",
    title: "7. 문의처",
    content: (
      <p>
        개인정보 처리에 관한 문의는 아래 연락처로 보내 주시면 됩니다. 이메일:{" "}
        <strong>[이메일 주소]</strong> · 사업자명: <strong>[사업자명]</strong>
      </p>
    ),
  },
];

export function PrivacyPolicy() {
  return (
    <LegalLayout type="privacy" title="개인정보처리방침" sections={sections} />
  );
}
