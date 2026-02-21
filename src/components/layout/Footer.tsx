'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

function TermsContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p className="text-xs text-muted-foreground">시행일자: 2026년 3월 1일</p>
      <p>본 이용약관(이하 &quot;약관&quot;)은 [회사명] (이하 &quot;회사&quot;)가 제공하는 Reseller Data 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

      <section>
        <h4 className="font-bold mb-1">제1조 (목적)</h4>
        <p>본 약관은 회사가 제공하는 판매 데이터 관리 및 분석 서비스의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
      </section>

      <section>
        <h4 className="font-bold mb-1">제2조 (정의)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>&quot;서비스&quot;란 회사가 제공하는 판매 데이터 입력, 저장, 분석, 시각화 및 관련 기능 일체를 의미합니다.</li>
          <li>&quot;이용자&quot;란 본 약관에 동의하고 서비스를 이용하는 회원을 의미합니다.</li>
          <li>&quot;구독&quot;이란 월 단위 자동결제 방식으로 서비스를 이용하는 형태를 의미합니다.</li>
          <li>&quot;Free 플랜&quot;은 무료로 제공되는 제한적 기능의 서비스입니다.</li>
          <li>&quot;Pro 플랜&quot;은 유료 구독 기반의 확장 기능 서비스입니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제3조 (약관의 효력 및 변경)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.</li>
          <li>회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있습니다.</li>
          <li>변경된 약관은 공지 후 적용됩니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제4조 (회원가입 및 계정 관리)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>이용자는 정확한 정보를 제공하여 회원가입을 해야 합니다.</li>
          <li>계정 관리 책임은 이용자 본인에게 있습니다.</li>
          <li>타인의 정보를 도용하거나 허위 정보를 제공한 경우 회사는 계정 이용을 제한할 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제5조 (서비스 내용)</h4>
        <p>회사는 다음의 기능을 제공합니다:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>판매 데이터 입력 및 관리</li>
          <li>통계 및 시각화 대시보드</li>
          <li>판매처·마진 분석 기능</li>
          <li>(향후) AI 기반 분석 및 자동 추천 기능</li>
        </ul>
        <p className="mt-1">회사는 서비스의 일부 또는 전부를 변경, 중단할 수 있습니다.</p>
      </section>

      <section>
        <h4 className="font-bold mb-1">제6조 (요금 및 결제)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Pro 플랜은 월간 또는 연간 정기결제(자동결제) 방식으로 제공됩니다.</li>
          <li>결제는 토스페이먼츠(TossPayments) 결제대행사를 통해 이루어집니다.</li>
          <li>구독은 이용자가 해지하지 않는 한 동일 조건으로 자동 갱신됩니다.</li>
          <li>자동 갱신 시 등록된 결제 수단으로 요금이 자동 청구됩니다.</li>
          <li>이용자는 언제든지 구독을 해지할 수 있으며, 해지 시 이미 결제된 기간이 종료될 때까지 Pro 기능을 이용할 수 있습니다.</li>
          <li>환불 정책은 별도의 &quot;환불정책&quot;에 따릅니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제6조의2 (자동 갱신 고지)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>회사는 정기결제 갱신일 전에 이용자에게 결제 예정 사실을 이메일로 안내합니다. (월간 구독: 7일 전, 연간 구독: 15일 전)</li>
          <li>요금 변경이 있는 경우, 변경 적용일 30일 전까지 이용자에게 고지합니다.</li>
          <li>이용자는 갱신일 전까지 구독을 해지하여 다음 결제를 방지할 수 있습니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제6조의3 (청약철회)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>이용자는 결제일로부터 7일 이내에 청약철회를 요청할 수 있습니다. (전자상거래 등에서의 소비자보호에 관한 법률 제17조)</li>
          <li>단, 결제 이후 서비스를 실질적으로 이용한 경우(데이터 업로드, 수정, 삭제 등)에는 청약철회가 제한될 수 있습니다.</li>
          <li>청약철회가 승인된 경우 결제 금액 전액이 환불되며, 3~5 영업일 이내에 처리됩니다.</li>
          <li>청약철회 요청은 마이페이지 또는 고객센터(ushikiro34@gmail.com)를 통해 가능합니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제7조 (Free 플랜 이용 제한)</h4>
        <p>Free 플랜은 다음과 같은 제한이 있을 수 있습니다:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>데이터 저장 행 수 제한</li>
          <li>분석 기간 제한</li>
          <li>업로드 횟수 제한</li>
        </ul>
        <p className="mt-1">회사는 서비스 정책에 따라 제한 기준을 변경할 수 있습니다.</p>
      </section>

      <section>
        <h4 className="font-bold mb-1">제8조 (데이터 소유권)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>이용자가 업로드하거나 입력한 데이터의 소유권은 이용자에게 있습니다.</li>
          <li>회사는 서비스 제공 및 개선을 위해 해당 데이터를 처리할 수 있습니다.</li>
          <li>회사는 이용자의 동의 없이 데이터를 제3자에게 제공하지 않습니다(법령에 따른 경우 제외).</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제9조 (서비스 이용 제한)</h4>
        <p>다음 행위는 금지됩니다:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>타인의 데이터 무단 업로드</li>
          <li>서비스 시스템에 대한 공격</li>
          <li>불법 행위 목적 사용</li>
          <li>회사의 운영을 방해하는 행위</li>
        </ul>
        <p className="mt-1">위반 시 계정 이용이 제한될 수 있습니다.</p>
      </section>

      <section>
        <h4 className="font-bold mb-1">제10조 (면책)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>회사가 제공하는 분석 결과, 통계, AI 추천은 참고용 정보입니다.</li>
          <li>가격 결정, 투자 판단, 사업 의사결정에 대한 책임은 이용자에게 있습니다.</li>
          <li>회사는 천재지변, 서버 장애 등 불가항력적 사유에 대해 책임을 지지 않습니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제11조 (서비스 중단)</h4>
        <p>회사는 다음의 경우 서비스 제공을 일시 중단할 수 있습니다:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>시스템 점검</li>
          <li>기술적 장애</li>
          <li>법령상 요구</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제12조 (계약 해지)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>이용자는 언제든지 회원 탈퇴 및 구독 해지를 할 수 있습니다.</li>
          <li>구독 해지 시 이미 결제된 기간이 종료될 때까지 Pro 기능을 이용할 수 있으며, 다음 결제일부터 과금이 중단됩니다.</li>
          <li>해지 후 Free 플랜 전환 시 데이터 저장 행 수 1,000건 제한, 업로드 횟수 10회 제한이 적용됩니다.</li>
          <li>제한 초과 데이터는 삭제되지 않으나, 추가 입력 및 일부 기능이 제한됩니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">제13조 (준거법 및 관할)</h4>
        <p>본 약관은 대한민국 법률에 따르며, 분쟁 발생 시 회사 소재지 관할 법원을 제1심 관할 법원으로 합니다.</p>
      </section>
    </div>
  )
}

function PrivacyContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p className="text-xs text-muted-foreground">시행일자: 2026년 3월 1일</p>
      <p>[회사명] (이하 &quot;회사&quot;)는 개인정보보호법 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.</p>

      <section>
        <h4 className="font-bold mb-1">1. 수집하는 개인정보 항목</h4>
        <p>회사는 다음의 개인정보를 수집할 수 있습니다.</p>
        <div className="ml-2 space-y-2 mt-1">
          <div>
            <p className="font-medium">① 회원가입 및 서비스 이용 시</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>이메일 주소</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">② 결제 시</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>이메일</li>
              <li>결제 상태 정보</li>
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">※ 카드 정보는 토스페이먼츠를 통해 처리되며 회사는 직접 저장하지 않습니다.</p>
          </div>
          <div>
            <p className="font-medium">③ 서비스 이용 과정에서 자동 수집</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>접속 로그</li>
              <li>IP 주소</li>
              <li>브라우저 정보</li>
              <li>서비스 이용 기록</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">④ 이용자가 입력하는 데이터</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>판매 데이터</li>
              <li>상품 정보</li>
              <li>매출 및 비용 정보</li>
            </ul>
            <p className="mt-1 text-xs text-muted-foreground">※ 판매 데이터는 개인정보에 해당하지 않을 수 있으나, 서비스 운영상 보호 대상 정보로 관리합니다.</p>
          </div>
        </div>
      </section>

      <section>
        <h4 className="font-bold mb-1">2. 개인정보의 수집 및 이용 목적</h4>
        <p>회사는 다음 목적을 위해 개인정보를 처리합니다.</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>회원 가입 및 계정 관리</li>
          <li>서비스 제공 및 기능 운영</li>
          <li>요금 결제 및 구독 관리</li>
          <li>고객 문의 대응</li>
          <li>서비스 개선 및 통계 분석</li>
          <li>법령 준수 및 분쟁 대응</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">3. 개인정보의 보관 및 이용 기간</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>회원 탈퇴 시 지체 없이 파기합니다.</li>
          <li>단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.</li>
          <li>전자상거래 관련 기록: 5년</li>
          <li>소비자 불만 및 분쟁 처리 기록: 3년</li>
        </ul>
        <p className="mt-1">구독 해지 후에도 서비스 운영상 필요한 최소한의 정보는 관련 법령에 따라 보관될 수 있습니다.</p>
      </section>

      <section>
        <h4 className="font-bold mb-1">4. 개인정보의 제3자 제공</h4>
        <p>회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.</p>
        <p>다만, 다음의 경우 예외로 합니다:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>이용자의 동의가 있는 경우</li>
          <li>법령에 따른 요청이 있는 경우</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">5. 개인정보 처리의 위탁</h4>
        <p>회사는 원활한 서비스 제공을 위해 다음과 같이 업무를 위탁할 수 있습니다.</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Supabase: 데이터 저장 및 인증 처리</li>
          <li>토스페이먼츠(TossPayments): 결제 처리</li>
          <li>Vercel(또는 클라우드 사업자): 서버 운영</li>
        </ul>
        <p className="mt-1">위탁 업체는 관련 법령에 따라 개인정보를 안전하게 처리합니다.</p>
      </section>

      <section>
        <h4 className="font-bold mb-1">6. 개인정보의 국외 이전</h4>
        <p>서비스 운영 과정에서 개인정보가 국외 서버에 저장될 수 있습니다.</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Supabase 서버 위치: (예: 싱가포르 / 미국 등 실제 위치 기재)</li>
          <li>토스페이먼츠 서버 위치: 대한민국</li>
        </ul>
        <p className="mt-1">회사는 관련 법령에 따라 안전하게 관리합니다.</p>
      </section>

      <section>
        <h4 className="font-bold mb-1">7. 이용자의 권리</h4>
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>개인정보 열람 요청</li>
          <li>수정 요청</li>
          <li>삭제 요청</li>
          <li>처리 정지 요청</li>
        </ul>
        <p className="mt-1">요청은 아래 연락처를 통해 가능합니다.</p>
      </section>

      <section>
        <h4 className="font-bold mb-1">8. 개인정보의 파기 절차 및 방법</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>보유 기간 경과 또는 처리 목적 달성 시 지체 없이 파기합니다.</li>
          <li>전자적 파일은 복구 불가능한 방법으로 삭제합니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">9. 개인정보의 안전성 확보 조치</h4>
        <p>회사는 다음과 같은 조치를 취하고 있습니다:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>HTTPS 통신 암호화</li>
          <li>접근 권한 최소화</li>
          <li>관리자 접근 통제</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">10. 개인정보 보호책임자 및 문의</h4>
        <p>개인정보 관련 문의는 아래로 연락하시기 바랍니다.</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>이메일: ushikiro34@gmail.com</li>
          <li>회사명: 로건개발</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">11. 방침 변경</h4>
        <p>본 방침은 법령 및 서비스 정책에 따라 변경될 수 있으며, 변경 시 사전 공지합니다.</p>
      </section>
    </div>
  )
}

function RefundContent() {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p className="text-xs text-muted-foreground">시행일자: 2026년 3월 1일</p>
      <p>Reseller Data 는 월간/연간 구독 기반 서비스입니다. 환불은 아래 기준에 따릅니다.</p>

      <section>
        <h4 className="font-bold mb-1">1. 기본 원칙</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>Pro 플랜은 월간 또는 연간 자동결제(정기결제) 방식입니다.</li>
          <li>이용자는 언제든지 구독을 해지할 수 있습니다.</li>
          <li>해지 시 이미 결제된 기간이 종료될 때까지 Pro 기능을 이용할 수 있으며, 다음 결제일부터 과금이 중단됩니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">2. 청약철회 (7일 이내 환불)</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따라, 결제일로부터 7일 이내에 청약철회를 요청할 수 있습니다.</li>
          <li>단, 결제 이후 서비스를 실질적으로 이용한 경우(데이터 업로드, 데이터 수정, 삭제 등)에는 청약철회가 제한될 수 있습니다.</li>
          <li>청약철회 시 결제 금액 전액이 환불됩니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">3. 일반 환불 기준</h4>
        <div className="ml-2 space-y-2">
          <div>
            <p className="font-medium">① 결제 후 서비스 미사용</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>결제일 이후 데이터 변화(업로드, 수정, 삭제)가 전혀 없는 경우</li>
            </ul>
            <p className="mt-1">→ 전액 환불 가능</p>
          </div>
          <div>
            <p className="font-medium">② 결제 후 서비스를 사용한 경우</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>이미 데이터를 입력·수정·삭제한 경우</li>
            </ul>
            <p className="mt-1">→ 원칙적으로 환불 불가, 잔여 기간까지 Pro 기능 유지</p>
          </div>
          <div>
            <p className="font-medium">③ 중복 결제 / 시스템 오류</p>
            <ul className="list-disc ml-5 mt-1 space-y-1">
              <li>중복 과금 확인 시 전액 환불</li>
              <li>기술적 오류로 인한 과금 시 전액 환불</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h4 className="font-bold mb-1">4. 연간 구독 해지</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>연간 구독 해지 시, 이미 결제된 기간이 종료될 때까지 Pro 기능을 이용할 수 있습니다.</li>
          <li>서비스 미사용(데이터 변화 없음) 시 전액 환불이 가능합니다.</li>
          <li>서비스 이용 이력이 있는 경우 남은 기간에 대한 부분 환불은 원칙적으로 제공하지 않습니다.</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">5. Free → Pro 전환 후 다운그레이드</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>환불 대신 구독 해지 처리</li>
          <li>이미 결제된 기간은 Pro 기능 사용 가능</li>
          <li>서비스 미사용 시 전액 환불 가능</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">6. 예외 환불</h4>
        <p>다음 경우 회사는 재량으로 환불을 제공할 수 있습니다:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>명백한 시스템 오류</li>
          <li>서비스 장애로 정상 이용 불가</li>
          <li>법령상 환불 의무 발생 시</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">7. 환불 요청 방법</h4>
        <ul className="list-disc ml-5 mt-1 space-y-1">
          <li>고객센터 이메일: ushikiro34@gmail.com</li>
          <li>결제일, 계정 이메일, 사유 기재</li>
          <li>영업일 기준 3~5일 이내 처리</li>
        </ul>
      </section>

      <section>
        <h4 className="font-bold mb-1">8. 결제 대행사 정책</h4>
        <p>실제 환불 처리 및 카드 취소는 결제대행사(토스페이먼츠) 정책에 따릅니다.</p>
      </section>
    </div>
  )
}

export function Footer() {
  const [termsOpen, setTermsOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)

  return (
    <>
      <footer className="shrink-0 border-t border-border bg-lavender/40 px-6 py-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} 리셀러 데이터. All rights reserved.</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTermsOpen(true)}
            className="hover:underline hover:text-foreground transition-colors"
          >
            이용약관
          </button>
          <span>|</span>
          <button
            onClick={() => setPrivacyOpen(true)}
            className="hover:underline hover:text-foreground transition-colors"
          >
            개인정보처리방침
          </button>
          <span>|</span>
          <button
            onClick={() => setRefundOpen(true)}
            className="hover:underline hover:text-foreground transition-colors"
          >
            환불정책
          </button>
        </div>
      </footer>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="max-w-[700px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>이용약관</DialogTitle>
            <DialogDescription className="sr-only">리셀러 데이터 서비스 이용약관</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <TermsContent />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent className="max-w-[700px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>개인정보처리방침</DialogTitle>
            <DialogDescription className="sr-only">리셀러 데이터 개인정보처리방침</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <PrivacyContent />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-w-[700px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>환불정책</DialogTitle>
            <DialogDescription className="sr-only">리셀러 데이터 환불정책</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-2">
            <RefundContent />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}