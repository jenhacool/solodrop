import { Icon } from "@shopify/polaris";
import {
  FaAngleDoubleRight,
  FaAngleRight,
  FaArrowRight,
  FaCaretRight,
  FaChevronRight,
  FaLongArrowAltRight,
} from "react-icons/fa";

const plan =
  (typeof window !== "undefined" && sessionStorage?.getItem("plan")) || "";

const isDisableField = plan === "FREE";

export const GRID = "grid";
export const TRUE = "true";
export const BOTTOM = "bottom";
export const TOP = "top";
export const FALSE = "false";
export const COLLECTION = "collection";
export const BEST_SELLING = "best_selling";
export const LATEST = "latest";
export const RELATED = "related";
export const SPECIFIC = "specific";
export const THEME_EIGHTEEN = "theme_eighteen";
export const THEME_TWENTY = "theme_twenty";
export const THEME_TWENTY_ONE = "theme_twenty_one";
export const THEME_ONE = "theme_one";
export const THEME_TWO = "theme_two";
export const THEME_THREE = "theme_three";
export const THEME_FOUR = "theme_four";
export const THEME_TWENTY_EIGHT = "theme_twenty_eight";
export const THEME_FIVE = "theme_five";
export const THEME_SIX = "theme_six";
export const THEME_SEVEN = "theme_seven";
export const THEME_NINE = "theme_nine";
export const THEME_EIGHT = "theme_eight";

export const THEME_TEN = "theme_ten";
export const THEME_ELEVEN = "theme_eleven";

export const THEME_THIRTEEN = "theme_thirteen";
export const THEME_FOURTEEN = "theme_fourteen";
export const THEME_FIFTEEN = "theme_fifteen";
export const THEME_SIXTEEN = "theme_sixteen";
export const THEME_SEVENTEEN = "theme_seventeen";

export const THEME_NINETEEN = "theme_nineteen";
export const THEME_TWENTY_TWO = "theme_twenty_two";
export const THEME_TWENTY_THREE = "theme_twenty_three";
export const THEME_TWENTY_FOUR = "theme_twenty_four";
export const THEME_TWENTY_FIVE = "theme_twenty_five";
export const THEME_TWENTY_SIX = "theme_twenty_six";
export const THEME_TWENTY_SEVEN = "theme_twenty_seven";
export const THEME_TWELVE = "theme_twelve";

export const FONT_FAMILY = "font-family";
export const COLOR = "color";
export const HOVER_COLOR = "hover_color";

export const OptionLayoutPreset = (isDisableField) => {
  return [
    { label: "Slider", value: "slider" },
    { label: "Grid", value: "grid", disabled: isDisableField },
  ];
}

export const OptionGridStyle = [
  { label: "Even", value: "even" },
  { label: "Mansonry", value: "masonry" },
];

export const OptionRelatedCondition = [
  { label: "Vendor", value: "vendor" },
  { label: "Product Type", value: "type" },
  { label: "Tags", value: "tags" },
  { label: "Collection (Coming soon)", value: "collection", disabled: true},
];

export const OptionTheme = (isDisableField) => {
  return [
    { label: "Theme One", value: "theme_one" },
    { label: "Theme Two", value: "theme_two" },
    { label: "Theme Three", value: "theme_three" },
    { label: "Theme Four", value: "theme_four", disabled: isDisableField },
    { label: "Theme Five", value: "theme_five", disabled: isDisableField },
    { label: "Theme Six", value: "theme_six", disabled: isDisableField },
    { label: "Theme Seven", value: "theme_seven", disabled: isDisableField },
    { label: "Theme Eight", value: "theme_eight", disabled: isDisableField },
    { label: "Theme Nine", value: "theme_nine", disabled: isDisableField },
    { label: "Theme Ten", value: "theme_ten", disabled: isDisableField },
    { label: "Theme Eleven", value: "theme_eleven", disabled: isDisableField },
    { label: "Theme Twelve", value: "theme_twelve", disabled: isDisableField },
    { label: "Theme Thirteen", value: "theme_thirteen", disabled: isDisableField },
    { label: "Theme Fourteen", value: "theme_fourteen", disabled: isDisableField },
    { label: "Theme Fifteen", value: "theme_fifteen", disabled: isDisableField },
    { label: "Theme Sixteen", value: "theme_sixteen", disabled: isDisableField },
    { label: "Theme Seventeen", value: "theme_seventeen", disabled: isDisableField },
    { label: "Theme Eighteen", value: "theme_eighteen", disabled: isDisableField },
    { label: "Theme Nineteen", value: "theme_nineteen", disabled: isDisableField },
    { label: "Theme Twenty", value: "theme_twenty", disabled: isDisableField },
    { label: "Theme Twenty One", value: "theme_twenty_one", disabled: isDisableField },
    { label: "Theme Twenty Two", value: "theme_twenty_two", disabled: isDisableField },
    { label: "Theme Twenty Three", value: "theme_twenty_three", disabled: isDisableField },
    { label: "Theme Twenty Four", value: "theme_twenty_four", disabled: isDisableField },
    { label: "Theme Twenty Five", value: "theme_twenty_five", disabled: isDisableField },
    { label: "Theme Twenty Six", value: "theme_twenty_six", disabled: isDisableField },
    { label: "Theme Twenty Seven", value: "theme_twenty_seven", disabled: isDisableField },
    { label: "Theme Twenty Eight", value: "theme_twenty_eight", disabled: isDisableField },
  ];
}

export const optionSlideMode = (isDisableField) => {
  return [
    { label: "Standard", value: "false" },
    { label: "Ticker", value: "true", disabled: isDisableField },
  ];
}

export const optionSlideDirection = [
  { label: "Right to Left", value: "false" },
  { label: "Left to Right", value: "true" },
];

export const optionNavigation = [
  { label: "Show", value: "true" },
  { label: "Hide", value: "false" },
  { label: "Hide on Mobile", value: "hide_on_mobile" },
];

export const optionIconStyle = [
  { label: <Icon source={FaAngleRight} color="base" />, value: "angle" },
  { label: <Icon source={FaChevronRight} color="base" />, value: "chevron" },
  {
    label: <Icon source={FaAngleDoubleRight} color="base" />,
    value: "angle-double",
  },
  { label: <Icon source={FaArrowRight} color="base" />, value: "arrow" },
  {
    label: <Icon source={FaLongArrowAltRight} color="base" />,
    value: "long-arrow",
  },
  { label: <Icon source={FaCaretRight} color="base" />, value: "caret" },
];

export const optionPositon = [
  { label: "Top right", value: "top_right" },
  { label: "Top center", value: "top_center" },
  { label: "Top left", value: "top_left" },
  { label: "Bottom left", value: "bottom_left" },
  { label: "Bottom center", value: "bottom_center" },
  { label: "Bottom right", value: "bottom_right" },
  { label: "Vertically center", value: "vertical_center" },
  { label: "Vertically center inner", value: "vertical_center_inner" },
  {
    label: "Vertically center inner on hover",
    value: "vertical_center_inner_hover",
  },
];

export const optionNavigationArrowColor = {
  color: "Color",
  hover_color: "Hover Color",
  background: "Background",
  hover_background: "Hover Background",
  border: "Border",
  hover_border: "Hover Border",
};

export const optionPaginationType = [
  { label: "Number", value: "number" },
  { label: "Dots", value: "dots" },
];

export const optionProductLinkTarget = [
  { label: "Current Tab", value: "_self" },
  { label: "New Tab", value: "_blank" },
];

export const optionAddToCartBorderStyle = [
  { label: "Solid", value: "solid" },
  { label: "Dashed", value: "dashed" },
  { label: "Dotted", value: "dotted" },
  { label: "Double", value: "double" },
  { label: "Inset", value: "inset" },
  { label: "Outset", value: "outset" },
  { label: "Groove", value: "groove" },
  { label: "Ridge", value: "ridge" },
  { label: "None", value: "none" },
];

export const optionImageMode = (isDisableField) => {
  return [
    { label: "Normal", value: "" },
    {
      label: "Grayscale with normal on hover",
      value: "sp-wpsp-gray-with-normal-on-hover",
      disabled: isDisableField
    },
    { label: "Grayscale on hover", value: "sp-wpsp-gray-on-hover", disabled: isDisableField },
    { label: "Always Grayscale", value: "sp-wpsp-always-gray", disabled: isDisableField },
  ];
}

export const optionFontFamily = [
  { title: "ggg" },
  { label: "Arial", value: "arial" },
  { label: "Arial Black", value: "arial_black" },
  { label: "Hevetica", value: "hevetica" },
  { label: "Courier New", value: "courier_new" },
];

export const optionTextAlign = [
  { label: "Inherit", value: "inherit" },
  { label: "Left", value: "left" },
  { label: "Center", value: "center" },
  { label: "Right", value: "right" },
  { label: "Justify", value: "justify" },
  { label: "Initial", value: "intial" },
];

export const optionTextTransform = [
  { label: "None", value: "none" },
  { label: "Capitalize", value: "capitalize" },
  { label: "Uppercase", value: "uppercase" },
  { label: "Lowercase", value: "lowercase" },
];

export const optionProductOrder = [
  { label: "Product title A-Z", value: "ALPHA_ASC" },
  { label: "Highest price", value: "PRICE_DESC" },
  { label: "Lowest price", value: "PRICE_ASC" },
  { label: "Newest", value: "CREATED_DESC" },
  { label: "Oldest", value: "CREATED" },
];

export const OptionProductFilter = (isDisableField) => ([
  { label: "Specific", value: "specific" },
  {label: "Featured products (Manually Sort)", value: "collection"},
  {label: "Best selling products", value: "best_selling", disabled: isDisableField},
  {label: "Latest products", value: "latest", disabled: isDisableField},
  {label: "Related products", value: "related", disabled: isDisableField},
  {label: "Recently viewed products", value: "recently_viewed", disabled: isDisableField}
]);

export const optionDescriptionType = [
  { label: "Short", value: "short_description" },
  { label: "Full", value: "full_description" },
];

export const optionPosition = [
  { label: "Top of the Page", value: "top" },
  { label: "Bottom of the Page", value: "bottom" },
];
