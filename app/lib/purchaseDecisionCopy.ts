export function formatTopicExpectedUnderstanding(value: string): string {
  return value
    .replace(/([을를])\s+에 대한 내용을 확인할 수 있습니다\.$/, "$1 확인할 수 있습니다.")
    .replace(/한다 확인할 수 있습니다\.$/, "하는 내용을 확인할 수 있습니다.");
}
