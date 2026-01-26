/**
 * pharma_config.js - 生藥學分類設定檔
 * 依據使用者的 Word 文件建立，支援中英文連動選單
 */

const PHARMA_CATEGORIES = [
    {
        name_ch: "配醣體",
        name_en: "Glycoside",
        subcategories: [
            { ch: "強心配醣體", en: "Cardiac Glycosides" },
            { ch: "蒽醌類配醣體", en: "Anthraquinone Glycosides" },
            { ch: "皂素配醣體", en: "Saponin Glycosides" },
            { ch: "氰類配醣體", en: "Cyanogenic Glycosides" },
            { ch: "異硫氰酸配醣體", en: "Isothiocyanate Glycosides" },
            { ch: "醇類配醣體", en: "Alcohol Glycosides" },
            { ch: "醛類配醣體", en: "Aldehyde Glycosides" },
            { ch: "酚類配醣體", en: "Phenol Glycosides" },
            { ch: "其他配醣體", en: "Other Glycosides" }
        ]
    },
    {
        name_ch: "生物鹼",
        name_en: "Alkaloid",
        subcategories: [
            { ch: "吡啶-哌啶類", en: "Pyridine-Piperidine alkaloid" },
            { ch: "托烷類", en: "Tropane alkaloid" },
            { ch: "喹啉類", en: "Quinoline alkaloid" },
            { ch: "異喹啉類", en: "Isoquinoline alkaloid" },
            { ch: "咪唑類", en: "Imidazole alkaloid" },
            { ch: "吲哚類", en: "Indole alkaloid" },
            { ch: "嘌呤類 (黃嘌呤)", en: "Purine base (Xanthine)" },
            { ch: "固醇類生物鹼", en: "Steroidal alkaloid" },
            { ch: "生物鹼胺", en: "Alkaloidal amine" }
        ]
    },
    {
        name_ch: "多醣類",
        name_en: "Polysaccharides",
        subcategories: [
            { ch: "同質聚醣", en: "Homoglycan" },
            { ch: "異質聚醣", en: "Heteroglycan" }
        ]
    },
    {
        name_ch: "苯丙烷類",
        name_en: "Phenylpropanoids",
        subcategories: [
            { ch: "簡單苯丙烷類", en: "Simple phenylpropanoids" },
            { ch: "木酚素和新木酚素", en: "Lignans and Neolignans" },
            { ch: "類黃酮", en: "Flavonoids" },
            { ch: "單寧 (鞣質)", en: "Tannins" },
            { ch: "木質素", en: "Lignins" }
        ]
    },
    {
        name_ch: "萜類",
        name_en: "Terpenoids",
        subcategories: [
            { ch: "單萜", en: "Monoterpenoids" },
            { ch: "倍半萜", en: "Sesquiterpene" },
            { ch: "二萜", en: "Diterpene" },
            { ch: "三萜", en: "Triterpene" },
            { ch: "肆萜 (類胡蘿蔔素)", en: "Tetraterpene (Carotenoids)" }
        ]
    },
    {
        name_ch: "揮發油",
        name_en: "Volatile oil",
        subcategories: [
            { ch: "萜類揮發油", en: "Terpenoids Volatile" },
            { ch: "芳香類揮發油", en: "Aromatic Volatile" },
            { ch: "其他揮發油", en: "Other Volatile" }
        ]
    },
    {
        name_ch: "樹脂",
        name_en: "Resins",
        subcategories: [
            { ch: "樹脂類", en: "Resins" },
            { ch: "油樹脂類", en: "Oleoresins" },
            { ch: "油膠樹脂類", en: "Oleogumresins" },
            { ch: "香膠類", en: "Balsams" }
        ]
    },
    {
        name_ch: "油脂與蠟",
        name_en: "Lipids",
        subcategories: [
            { ch: "飽和固定油", en: "Saturated Fixed Oil" },
            { ch: "單不飽和固定油", en: "Monounsaturated Fixed Oil" },
            { ch: "多不飽和固定油", en: "Polyunsaturated Fixed Oil" },
            { ch: "脂肪及其相關化合物", en: "Fats and Related Compounds" },
            { ch: "蠟質", en: "Waxes" }
        ]
    }
];
