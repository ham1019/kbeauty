import { RoutineStep, Product } from './types.js';

export const morningRoutine: RoutineStep[] = [
  {
    order: 1,
    name_en: 'Cleanser',
    name_ko: '클렌저',
    description_en: 'Use a gentle cleanser suitable for morning',
    description_ko: '아침에 사용하기 좋은 부드러운 클렌저 사용',
    product_category: 'cleanser',
    estimated_time_minutes: 2,
    tips_en: 'Use lukewarm water, massage gently for 60 seconds',
    tips_ko: '미온수 사용, 60초간 부드럽게 마사지'
  },
  {
    order: 2,
    name_en: 'Essence',
    name_ko: '에센스',
    description_en: 'Apply essence for hydration',
    description_ko: '수분 공급을 위해 에센스 사용',
    product_category: 'essence',
    estimated_time_minutes: 1,
    tips_en: 'Lightly pat into skin with fingertips',
    tips_ko: '손가락으로 살짝 두드려 흡수시키기'
  },
  {
    order: 3,
    name_en: 'Vitamin C Serum',
    name_ko: '비타민C 세럼',
    description_en: 'Apply Vitamin C serum for brightening',
    description_ko: '밝은 피부 톤을 위해 비타민C 세럼 사용',
    product_category: 'serum',
    estimated_time_minutes: 2,
    tips_en: 'Use 3-4 drops, wait 1-2 minutes before next step',
    tips_ko: '3~4방울 사용, 다음 단계 전 1~2분 대기'
  },
  {
    order: 4,
    name_en: 'Eye Cream',
    name_ko: '아이크림',
    description_en: 'Apply eye cream to prevent fine lines',
    description_ko: '잔주름 방지를 위해 아이크림 사용',
    product_category: 'eye_cream',
    estimated_time_minutes: 1,
    tips_en: 'Use ring finger, gently tap around eye area',
    tips_ko: '약지 사용, 눈 주변 부드럽게 톡톡 두드리기'
  },
  {
    order: 5,
    name_en: 'Moisturizer',
    name_ko: '모이스처라이저',
    description_en: 'Apply moisturizer to lock in hydration',
    description_ko: '수분 보습을 위해 모이스처라이저 사용',
    product_category: 'moisturizer',
    estimated_time_minutes: 2,
    tips_en: 'Use upward strokes, wait until fully absorbed',
    tips_ko: '상향 스트로크 사용, 완전히 흡수될 때까지 대기'
  },
  {
    order: 6,
    name_en: 'SPF 50+ Sunscreen',
    name_ko: 'SPF 50+ 선크림',
    description_en: 'Apply broad-spectrum sunscreen (SPF 50+)',
    description_ko: '광범위 자외선 차단 선크림 (SPF 50+) 사용',
    product_category: 'sunscreen',
    estimated_time_minutes: 2,
    tips_en: 'Apply generously, reapply every 2 hours if outdoors',
    tips_ko: '넉넉하게 사용, 야외 활동 시 2시간마다 재도포'
  }
];

export const eveningRoutine: RoutineStep[] = [
  {
    order: 1,
    name_en: 'Cleanser',
    name_ko: '클렌저',
    description_en: 'Use a more thorough cleanser for evening',
    description_ko: '저녁에는 더 깊숙한 클렌징 사용',
    product_category: 'cleanser',
    estimated_time_minutes: 3,
    tips_en: 'Double cleanse: oil cleanser first, then water-based',
    tips_ko: '더블 클렌징: 오일 클렌저 후 수성 클렌저 사용'
  },
  {
    order: 2,
    name_en: 'Essence',
    name_ko: '에센스',
    description_en: 'Apply essence for extra hydration',
    description_ko: '추가 수분을 위해 에센스 사용',
    product_category: 'essence',
    estimated_time_minutes: 1,
    tips_en: 'Can apply 2-3 layers for extra hydration (layering)',
    tips_ko: '추가 수분을 위해 2~3층 사용 가능 (레이어링)'
  },
  {
    order: 3,
    name_en: 'Niacinamide Serum',
    name_ko: '나이아신아마이드 세럼',
    description_en: 'Apply niacinamide serum for pore refinement',
    description_ko: '모공 정돈을 위해 나이아신아마이드 세럼 사용',
    product_category: 'serum',
    estimated_time_minutes: 2,
    tips_en: 'Helps minimize pores and control oil production',
    tips_ko: '모공 축소 및 피지 조절 효과'
  },
  {
    order: 4,
    name_en: 'Eye Cream',
    name_ko: '아이크림',
    description_en: 'Apply eye cream for overnight recovery',
    description_ko: '밤샘 회복을 위해 아이크림 사용',
    product_category: 'eye_cream',
    estimated_time_minutes: 1,
    tips_en: 'Use a richer formula than morning for overnight treatment',
    tips_ko: '아침보다 더 진한 포뮬러 사용 권장'
  },
  {
    order: 5,
    name_en: 'Night Cream',
    name_ko: '나이트 크림',
    description_en: 'Apply rich night cream for intensive repair',
    description_ko: '집중 재생을 위해 리치 나이트 크림 사용',
    product_category: 'night_cream',
    estimated_time_minutes: 2,
    tips_en: 'Heavier texture ok for night, allows deep penetration',
    tips_ko: '밤에는 진한 텍스처 괜찮음, 깊숙한 침투 가능'
  },
  {
    order: 6,
    name_en: 'Lip Balm',
    name_ko: '립 밤',
    description_en: 'Apply lip balm before sleep',
    description_ko: '수면 전 립 밤 사용',
    product_category: 'lip_balm',
    estimated_time_minutes: 1,
    tips_en: 'Apply thickly for overnight lip recovery',
    tips_ko: '밤샘 입술 케어를 위해 넉넉하게 사용'
  }
];

export const products: Product[] = [
  {
    id: 'sulwhasoo-serum',
    brand: 'Sulwhasoo',
    name_en: 'First Care Activating Serum EX',
    name_ko: '설화수 자음생 에센스 EX',
    category: 'essence',
    price_usd: 110,
    rating: 4.8,
    image_url: 'https://via.placeholder.com/300x300?text=Sulwhasoo',
    main_ingredients: ['Ginseng', 'Fermented botanicals', 'Peptides'],
    skin_type_suitable: ['All skin types', 'Sensitive'],
    texture_en: 'Lightweight, fast-absorbing serum',
    texture_ko: '가볍고 빠르게 흡수되는 세럼'
  },
  {
    id: 'cosrx-snail',
    brand: 'COSRX',
    name_en: 'Advanced Snail 96 Mucin Power Essence',
    name_ko: 'COSRX 어드밴스드 스넬 96 뮤신',
    category: 'essence',
    price_usd: 21,
    rating: 4.7,
    image_url: 'https://via.placeholder.com/300x300?text=COSRX',
    main_ingredients: ['Snail secretion filtrate (96%)', 'Hyaluronic acid'],
    skin_type_suitable: ['Dry', 'Sensitive', 'Combination'],
    texture_en: 'Viscous, hydrating essence',
    texture_ko: '점성 있는 보습 에센스'
  },
  {
    id: 'innisfree-greentea',
    brand: 'Innisfree',
    name_en: 'Green Tea Seed Serum',
    name_ko: '이니스프리 그린티 씨드 세럼',
    category: 'serum',
    price_usd: 35,
    rating: 4.6,
    image_url: 'https://via.placeholder.com/300x300?text=Innisfree',
    main_ingredients: ['Green tea extract', 'Jeju green tea seeds', 'Niacinamide'],
    skin_type_suitable: ['Oily', 'Combination', 'All skin types'],
    texture_en: 'Lightweight, refreshing serum',
    texture_ko: '가볍고 상큼한 세럼'
  },
  {
    id: 'laneige-waterbank',
    brand: 'Laneige',
    name_en: 'Water Bank Hydro Cream',
    name_ko: '라네즈 워터뱅크 하이드로 크림',
    category: 'moisturizer',
    price_usd: 45,
    rating: 4.8,
    image_url: 'https://via.placeholder.com/300x300?text=Laneige',
    main_ingredients: ['Water bank complex', 'Mineral water', 'Hyaluronic acid'],
    skin_type_suitable: ['Dry', 'Normal', 'Combination'],
    texture_en: 'Light cream with gel texture',
    texture_ko: '젤 텍스처의 가벼운 크림'
  }
];
