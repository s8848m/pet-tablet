// 모든 모듈은 Date.now() 대신 이걸 쓴다. 테스트에서 clock.now를 바꿔 시간을 돌린다.
export const clock = { now: () => Date.now() };
