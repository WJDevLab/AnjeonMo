from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.colors import HexColor, Color, white, black
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "safe3_mobile_app_concept.pdf"
IMG_DIR = ROOT / "output" / "imagegen"

PAGE_W, PAGE_H = landscape(A4)
M = 34

NAVY = HexColor("#071326")
INK = HexColor("#111827")
MUTED = HexColor("#667085")
LINE = HexColor("#D8DEE8")
PAPER = HexColor("#F7F8FA")
GREEN = HexColor("#149447")
MINT = HexColor("#DFF5E8")
ORANGE = HexColor("#FF6A00")
BLUE = HexColor("#1769F5")
PURPLE = HexColor("#6C4DE6")
RED = HexColor("#E3262E")
GRAY = HexColor("#353A43")

pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("MalgunBold", r"C:\Windows\Fonts\malgunbd.ttf"))


def set_font(c, size, bold=False, color=INK):
    c.setFont("MalgunBold" if bold else "Malgun", size)
    c.setFillColor(color)


def text(c, x, y, s, size=10, bold=False, color=INK):
    set_font(c, size, bold, color)
    c.drawString(x, y, s)


def right_text(c, x, y, s, size=9, bold=False, color=MUTED):
    set_font(c, size, bold, color)
    c.drawRightString(x, y, s)


def wrap(c, x, y, s, width, size=9, leading=14, bold=False, color=INK, max_lines=8):
    words = list(s)
    lines, current = [], ""
    font = "MalgunBold" if bold else "Malgun"
    for ch in words:
        candidate = current + ch
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            lines.append(current)
            current = ch
    if current:
        lines.append(current)
    lines = lines[:max_lines]
    set_font(c, size, bold, color)
    for i, line in enumerate(lines):
        c.drawString(x, y - i * leading, line)
    return y - len(lines) * leading


def round_box(c, x, y, w, h, fill=white, stroke=LINE, radius=12, sw=0.8):
    c.setLineWidth(sw)
    c.setStrokeColor(stroke)
    c.setFillColor(fill)
    c.roundRect(x, y, w, h, radius, stroke=1, fill=1)


def pill(c, x, y, label, color, text_color=white, width=None):
    size = 8.5
    if width is None:
        width = pdfmetrics.stringWidth(label, "MalgunBold", size) + 22
    c.setFillColor(color)
    c.roundRect(x, y, width, 20, 10, stroke=0, fill=1)
    set_font(c, size, True, text_color)
    c.drawCentredString(x + width / 2, y + 6, label)
    return width


def page_header(c, kicker, title, page_no, dark=False):
    if dark:
        kicker_color, title_color, line_color = HexColor("#8DA2C6"), white, HexColor("#2B3C58")
    else:
        kicker_color, title_color, line_color = BLUE, NAVY, LINE
    text(c, M, PAGE_H - 34, kicker.upper(), 8, True, kicker_color)
    text(c, M, PAGE_H - 58, title, 21, True, title_color)
    c.setStrokeColor(line_color)
    c.setLineWidth(0.8)
    c.line(M, PAGE_H - 70, PAGE_W - M, PAGE_H - 70)
    right_text(c, PAGE_W - M, PAGE_H - 34, f"SAFE 3  |  {page_no:02d}", 8, True, kicker_color)


def footer(c, page_no, dark=False):
    color = HexColor("#8290A6") if dark else HexColor("#98A2B3")
    text(c, M, 18, "Arduino pressure-sensor kickboard safety app concept", 7, False, color)
    right_text(c, PAGE_W - M, 18, str(page_no), 7, True, color)


def draw_image_fit(c, path, x, y, w, h, radius=10, fill=white, stroke=LINE):
    round_box(c, x, y, w, h, fill=fill, stroke=stroke, radius=radius)
    with Image.open(path) as im:
        iw, ih = im.size
    scale = min((w - 4) / iw, (h - 4) / ih)
    dw, dh = iw * scale, ih * scale
    dx, dy = x + (w - dw) / 2, y + (h - dh) / 2
    c.drawImage(ImageReader(str(path)), dx, dy, dw, dh, preserveAspectRatio=True, mask="auto")


def draw_rule_card(c, x, y, w, h, number, title_s, body, color, status):
    round_box(c, x, y, w, h, fill=white, stroke=LINE, radius=14)
    c.setFillColor(color)
    c.circle(x + 28, y + h - 28, 15, stroke=0, fill=1)
    set_font(c, 11, True, white)
    c.drawCentredString(x + 28, y + h - 32, str(number))
    text(c, x + 52, y + h - 24, title_s, 13, True, NAVY)
    wrap(c, x + 20, y + h - 58, body, w - 40, 9, 14, False, MUTED, 5)
    pill(c, x + 20, y + 18, status, color)


def concept_page(c, page_no, code, title_s, image_name, color, combo, flow, strengths):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    page_header(c, f"CONCEPT {code}", title_s, page_no)
    image_path = IMG_DIR / image_name
    draw_image_fit(c, image_path, M, 153, PAGE_W - 2 * M, 350, radius=14)

    left_w = 245
    round_box(c, M, 42, left_w, 94, fill=white, stroke=LINE, radius=12)
    pill(c, M + 16, 102, f"조합 {code}", color)
    wrap(c, M + 16, 88, combo, left_w - 32, 9, 13, True, NAVY, 4)

    x2 = M + left_w + 14
    mid_w = 240
    round_box(c, x2, 42, mid_w, 94, fill=white, stroke=LINE, radius=12)
    text(c, x2 + 16, 108, "화면 흐름", 8, True, color)
    wrap(c, x2 + 16, 90, flow, mid_w - 32, 8.5, 12, False, INK, 5)

    x3 = x2 + mid_w + 14
    right_w = PAGE_W - M - x3
    round_box(c, x3, 42, right_w, 94, fill=white, stroke=LINE, radius=12)
    text(c, x3 + 16, 108, "핵심 강점", 8, True, color)
    wrap(c, x3 + 16, 90, strengths, right_w - 32, 8.5, 12, False, INK, 5)
    footer(c, page_no)


def draw_cover(c):
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    c.setFillColor(BLUE)
    c.rect(0, PAGE_H - 7, PAGE_W, 7, stroke=0, fill=1)
    text(c, M, PAGE_H - 50, "MOBILE APP CONCEPT BOOK", 8, True, HexColor("#7DB5FF"))
    text(c, M, PAGE_H - 94, "SAFE 3", 34, True, white)
    text(c, M, PAGE_H - 120, "압력 센서 기반 스마트 킥보드 안전 앱", 17, True, HexColor("#D8E6FF"))
    wrap(c, M, PAGE_H - 146,
         "발 압력 패턴이 3개 이상이거나 헬멧 착용 압력이 확인되지 않으면 운행을 중지하는 모바일 앱 콘셉트입니다.",
         510, 9.5, 15, False, HexColor("#AFC0D8"), 3)
    draw_image_fit(c, IMG_DIR / "concept-f-integrated.png", M, 55, PAGE_W - 2 * M, 335,
                   radius=16, fill=HexColor("#101D32"), stroke=HexColor("#314867"))
    pill(c, PAGE_W - M - 134, PAGE_H - 112, "6 CONCEPTS / 31 SCENES", BLUE, width=134)
    text(c, M, 28, "Concept exploration and integrated recommendation", 8, False, HexColor("#8290A6"))
    right_text(c, PAGE_W - M, 28, "2026.08", 8, True, HexColor("#8290A6"))
    c.showPage()


def draw_system_page(c):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    page_header(c, "SYSTEM", "앱이 해결하는 안전 문제와 자동 정지 규칙", 2)

    gap = 14
    card_w = (PAGE_W - 2 * M - 2 * gap) / 3
    y, h = 270, 225
    draw_rule_card(c, M, y, card_w, h, 1, "데크 압력 감지",
                   "킥보드 데크의 압력 센서가 발이 놓인 위치와 압력 패턴을 실시간으로 확인합니다.",
                   BLUE, "실시간 센서")
    draw_rule_card(c, M + card_w + gap, y, card_w, h, 2, "발 3개 이상",
                   "감지된 발 압력 패턴이 3개 이상이면 다인 탑승 위험으로 판단하고 안전 정지 상태로 전환합니다.",
                   ORANGE, "정지 조건")
    draw_rule_card(c, M + 2 * (card_w + gap), y, card_w, h, 3, "헬멧 미착용",
                   "헬멧 내부 압력 센서가 착용을 확인하지 못하면 출발을 막거나 주행 중 안전 정지 요청을 보냅니다.",
                   RED, "정지 조건")

    round_box(c, M, 62, PAGE_W - 2 * M, 178, fill=NAVY, stroke=NAVY, radius=16)
    text(c, M + 20, 210, "권장 상태 흐름", 9, True, HexColor("#8DB9FF"))
    labels = [
        ("센서 연결", BLUE), ("헬멧 확인", PURPLE), ("발 개수 확인", ORANGE),
        ("주행 허가", GREEN), ("위험 감지", RED), ("점진 감속·정지", RED)
    ]
    usable = PAGE_W - 2 * M - 40
    box_w = (usable - 5 * 18) / 6
    bx, by = M + 20, 127
    for i, (label, color) in enumerate(labels):
        c.setFillColor(Color(color.red, color.green, color.blue, alpha=0.18))
        c.setStrokeColor(color)
        c.roundRect(bx, by, box_w, 50, 10, stroke=1, fill=1)
        set_font(c, 8.5, True, white)
        c.drawCentredString(bx + box_w / 2, by + 20, label)
        if i < len(labels) - 1:
            c.setStrokeColor(HexColor("#57708F"))
            c.line(bx + box_w + 4, by + 25, bx + box_w + 14, by + 25)
            c.line(bx + box_w + 10, by + 29, bx + box_w + 14, by + 25)
            c.line(bx + box_w + 10, by + 21, bx + box_w + 14, by + 25)
        bx += box_w + 18
    text(c, M + 20, 87,
         "주의: 실제 차량 제어는 앱 화면만으로 구현되지 않으며, 모터 제어기의 안전 감속·차단 회로와 센서 보정이 별도로 필요합니다.",
         8, False, HexColor("#AFC0D8"))
    footer(c, 2)
    c.showPage()


def draw_combo_map(c):
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    page_header(c, "COMBINATION MAP", "다섯 선택군을 빠짐없이 배정한 조합 전략", 3)
    cols = [52, 172, 150, 351]
    headers = ["안", "디자인 분위기", "포인트 색상", "화면 흐름"]
    x = M
    for i, (w, htxt) in enumerate(zip(cols, headers)):
        c.setFillColor(NAVY)
        c.rect(x, 470, w, 32, stroke=0, fill=1)
        text(c, x + 10, 481, htxt, 8, True, white)
        x += w

    rows = [
        ("A", "밝고 친근한 안전 앱", "초록", "시작 → 센서 연결 → 안전 검사 → 운행 → 중지", GREEN),
        ("B", "흑백 극미니멀", "주황", "로그인 → 킥보드 선택 → 헬멧 검사 → 발 감지 → 운행", ORANGE),
        ("C", "미래형 모빌리티", "파랑", "홈 → 준비 → 정상 → 발 3개 경고 → 헬멧 경고", BLUE),
        ("D", "공공 안전 서비스", "보라", "사용법 → 센서 상태 → 운행 허가 → 위험 감지 → 기록", PURPLE),
        ("E", "프리미엄 브랜드", "흑백 + 빨강", "한 장 안에 6개 핵심 장면을 모두 배치", RED),
        ("F", "다섯 분위기 통합", "역할 기반 5색", "로그인부터 자동 정지·기록까지 통합 여정", NAVY),
    ]
    row_h = 59
    y = 470 - row_h
    for idx, row in enumerate(rows):
        code, mood, palette, flow, color = row
        fill = white if idx % 2 == 0 else HexColor("#F1F4F8")
        c.setFillColor(fill)
        c.rect(M, y, sum(cols), row_h, stroke=0, fill=1)
        c.setStrokeColor(LINE)
        c.line(M, y, M + sum(cols), y)
        c.setFillColor(color)
        c.circle(M + 26, y + row_h / 2, 13, stroke=0, fill=1)
        set_font(c, 9, True, white)
        c.drawCentredString(M + 26, y + row_h / 2 - 3, code)
        text(c, M + cols[0] + 10, y + 25, mood, 8.5, True, INK)
        c.setFillColor(color)
        c.roundRect(M + cols[0] + cols[1] + 10, y + 18, 20, 20, 5, stroke=0, fill=1)
        text(c, M + cols[0] + cols[1] + 38, y + 25, palette, 8, True, INK)
        wrap(c, M + cols[0] + cols[1] + cols[2] + 10, y + 34, flow, cols[3] - 20, 8, 11, False, INK, 2)
        y -= row_h

    round_box(c, M, 45, PAGE_W - 2 * M, 58, fill=MINT, stroke=HexColor("#B8E4CA"), radius=12)
    text(c, M + 16, 78, "검증 결과", 9, True, GREEN)
    text(c, M + 96, 78, "분위기 5/5 · 색상 5/5 · 화면 구성 5/5 사용 완료", 10, True, NAVY)
    text(c, M + 96, 59, "F안은 다섯 조합의 장점을 역할별 색상 체계와 하나의 사용자 여정으로 다시 묶은 통합안입니다.", 8, False, MUTED)
    footer(c, 3)
    c.showPage()


def draw_integrated(c):
    page_no = 9
    c.setFillColor(NAVY)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    page_header(c, "FINAL INTEGRATION", "F안 - 모든 장점을 합친 권장 콘셉트", page_no, dark=True)
    draw_image_fit(c, IMG_DIR / "concept-f-integrated.png", M, 155, PAGE_W - 2 * M, 350,
                   radius=14, fill=HexColor("#0C1930"), stroke=HexColor("#314867"))
    x = M
    items = [
        ("초록", "정상·허가", GREEN), ("파랑", "센서·연결", BLUE),
        ("보라", "안내·검사", PURPLE), ("주황", "주의·확인", ORANGE),
        ("빨강", "정지·위험", RED)
    ]
    w = (PAGE_W - 2 * M - 4 * 10) / 5
    for label, role, color in items:
        c.setFillColor(HexColor("#101F36"))
        c.setStrokeColor(HexColor("#2D415F"))
        c.roundRect(x, 70, w, 63, 12, stroke=1, fill=1)
        c.setFillColor(color)
        c.circle(x + 20, 101, 7, stroke=0, fill=1)
        text(c, x + 34, 105, label, 8.5, True, white)
        text(c, x + 34, 87, role, 8, False, HexColor("#AFC0D8"))
        x += w + 10
    footer(c, page_no, dark=True)
    c.showPage()


def draw_coverage(c):
    page_no = 10
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    page_header(c, "COVERAGE CHECK", "모든 선택지가 실제로 어디에 사용되었는지", page_no)
    groups = [
        ("디자인 분위기 5/5", [
            ("친근한 안전", "A + F", GREEN), ("흑백 미니멀", "B + F", GRAY),
            ("미래형", "C + F", BLUE), ("공공 안전", "D + F", PURPLE),
            ("프리미엄", "E + F", RED)]),
        ("포인트 색상 5/5", [
            ("초록", "A + F", GREEN), ("주황", "B + F", ORANGE),
            ("파랑", "C + F", BLUE), ("보라", "D + F", PURPLE),
            ("빨강", "E + F", RED)]),
        ("화면 구성 5/5", [
            ("시작·연결·검사", "A + F", GREEN), ("로그인·선택", "B + F", ORANGE),
            ("정상·이중경고", "C + F", BLUE), ("안내·허가·기록", "D + F", PURPLE),
            ("6장면 보드", "E + F", RED)]),
    ]
    top_y = 466
    for gi, (title_s, items) in enumerate(groups):
        y = top_y - gi * 137
        text(c, M, y + 50, title_s, 12, True, NAVY)
        cell_gap = 10
        cell_w = (PAGE_W - 2 * M - 4 * cell_gap) / 5
        x = M
        for label, used, color in items:
            round_box(c, x, y - 22, cell_w, 60, fill=white, stroke=LINE, radius=10)
            c.setFillColor(color)
            c.roundRect(x + 10, y + 18, 20, 8, 4, stroke=0, fill=1)
            text(c, x + 10, y + 2, label, 8, True, INK)
            text(c, x + 10, y - 14, used, 7.5, False, MUTED)
            x += cell_w + cell_gap

    round_box(c, M, 43, PAGE_W - 2 * M, 78, fill=NAVY, stroke=NAVY, radius=14)
    text(c, M + 18, 91, "통합 원칙", 9, True, HexColor("#8DB9FF"))
    text(c, M + 96, 92, "형태는 하나로, 색은 역할로, 경고는 두 원인으로 분리", 12, True, white)
    text(c, M + 96, 68,
         "발 3개 이상과 헬멧 미착용을 같은 빨강 정지 상태로 묶되, 원인 카드와 복구 행동은 각각 명확히 보여줍니다.",
         8.5, False, HexColor("#AFC0D8"))
    footer(c, page_no)
    c.showPage()


def draw_recommendation(c):
    page_no = 11
    c.setFillColor(PAPER)
    c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    page_header(c, "RECOMMENDATION", "데모 제작 시 권장하는 최종 방향", page_no)

    left = 480
    round_box(c, M, 73, left, 420, fill=white, stroke=LINE, radius=16)
    text(c, M + 22, 458, "추천: F안 SAFE 3", 17, True, NAVY)
    wrap(c, M + 22, 430,
         "사용자는 센서 원리를 몰라도 초록·주황·빨강의 상태 변화를 즉시 이해하고, 필요할 때만 파랑 센서 정보와 보라 안내를 확인할 수 있습니다.",
         left - 44, 9.5, 15, False, MUTED, 5)

    steps = [
        ("01", "시작", "로그인 또는 바로 시작", GREEN),
        ("02", "연결", "킥보드·데크·헬멧 센서 확인", BLUE),
        ("03", "검사", "헬멧 착용 + 발 2개 이하", PURPLE),
        ("04", "허가", "모든 조건 충족 시 주행 가능", GREEN),
        ("05", "정지", "발 3개 이상 또는 헬멧 미착용", RED),
    ]
    sy = 333
    for no, title_s, desc, color in steps:
        c.setFillColor(color)
        c.circle(M + 39, sy + 11, 15, stroke=0, fill=1)
        set_font(c, 7.5, True, white)
        c.drawCentredString(M + 39, sy + 8, no)
        text(c, M + 66, sy + 15, title_s, 9.5, True, NAVY)
        text(c, M + 116, sy + 15, desc, 8.5, False, MUTED)
        if no != "05":
            c.setStrokeColor(LINE)
            c.line(M + 39, sy - 8, M + 39, sy - 29)
        sy -= 59

    rx = M + left + 16
    rw = PAGE_W - M - rx
    round_box(c, rx, 302, rw, 191, fill=NAVY, stroke=NAVY, radius=16)
    text(c, rx + 18, 459, "구현 시 꼭 확인할 점", 12, True, white)
    notes = [
        "압력 임계값과 센서 수를 실제 데크에서 보정",
        "발 개수 오판을 줄이기 위한 영역·시간 필터 적용",
        "주행 중 즉시 바퀴 잠금 대신 안전한 감속 로직 사용",
        "헬멧 센서 단선·배터리 부족도 미착용과 구분 표시",
    ]
    ny = 426
    for note in notes:
        c.setFillColor(BLUE)
        c.circle(rx + 22, ny + 3, 3, stroke=0, fill=1)
        wrap(c, rx + 34, ny + 7, note, rw - 52, 8.5, 13, False, HexColor("#C8D6EA"), 2)
        ny -= 35

    round_box(c, rx, 73, rw, 213, fill=white, stroke=LINE, radius=16)
    text(c, rx + 18, 250, "최종 색상 역할", 11, True, NAVY)
    roles = [(GREEN, "정상"), (BLUE, "센서"), (PURPLE, "안내"), (ORANGE, "주의"), (RED, "정지")]
    yy = 214
    for color, label in roles:
        c.setFillColor(color)
        c.roundRect(rx + 18, yy, 34, 16, 8, stroke=0, fill=1)
        text(c, rx + 64, yy + 4, label, 8.5, True, INK)
        yy -= 30
    footer(c, page_no)
    c.showPage()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(PAGE_W, PAGE_H), pageCompression=1)
    c.setTitle("SAFE 3 - Smart Kickboard Safety App Concept")
    c.setAuthor("OpenAI Codex")

    draw_cover(c)
    draw_system_page(c)
    draw_combo_map(c)
    concept_page(c, 4, "A", "친근한 초록 안전 서비스", "concept-a-friendly-green.png", GREEN,
                 "밝고 친근한 안전 앱 + 안전 초록 + 기본 안전 여정",
                 "시작 화면 → 센서 연결 → 안전 검사 → 운행 화면 → 운행 중지",
                 "처음 보는 사용자도 즉시 이해하기 쉬운 카드와 명확한 정상·중지 대비")
    c.showPage()
    concept_page(c, 5, "B", "흑백 미니멀과 주황 제어", "concept-b-mono-orange.png", ORANGE,
                 "극도로 미니멀한 흑백 UI + 주황 포인트 + 기기 선택 여정",
                 "로그인 → 킥보드 선택 → 헬멧 검사 → 발 감지 → 운행 화면",
                 "정보 소음이 적고 제품·센서 상태가 가장 또렷하게 읽히는 구성")
    c.showPage()
    concept_page(c, 6, "C", "네온 블루 미래형 모빌리티", "concept-c-future-blue.png", BLUE,
                 "미래형 모빌리티 UI + 전기 파랑 + 이중 위험 경고 여정",
                 "홈 → 주행 준비 → 정상 상태 → 발 3개 감지 → 헬멧 미착용",
                 "압력 히트맵과 센서 파형으로 기술적 신뢰감을 강하게 전달")
    c.showPage()
    concept_page(c, 7, "D", "보라색 공공 안전 서비스", "concept-d-public-purple.png", PURPLE,
                 "신뢰감 있는 공공 서비스 + 보라 포인트 + 안내·기록 여정",
                 "사용법 안내 → 센서 상태 → 운행 허가 → 위험 감지 → 운행 기록",
                 "큰 글자와 픽토그램, 단계 안내로 다양한 사용자의 접근성을 지원")
    c.showPage()
    concept_page(c, 8, "E", "흑백·빨강 프리미엄 브랜드", "concept-e-premium-red.png", RED,
                 "프리미엄 전동킥보드 브랜드 + 흑백·빨강 + 6장면 보드",
                 "브랜드 시작 → 기기 연결 → 헬멧 확인 → 발 개수 → 안전 주행 → 자동 정지",
                 "제품 이미지를 고급스럽게 보여주면서 빨강 정지 상태를 극적으로 강조")
    c.showPage()
    draw_integrated(c)
    draw_coverage(c)
    draw_recommendation(c)
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
