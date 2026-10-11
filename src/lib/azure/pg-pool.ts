// @deprecated BP-DL-01: use getDb() from "@/lib/data-store/db". Kept only so
// nothing outside src breaks; removed in BP-DL-04.
export { getDb as getAzurePgPool } from "@/lib/data-store/db";
