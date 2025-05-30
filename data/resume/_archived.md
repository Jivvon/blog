#### [채널톡 Meet 서비스] - 내부망 고객사를 위한 WebRTC 전화 서비스 제공

- 배경
  - 내부망을 사용하는 고객사에 WebRTC 전화 서비스를 제공해야 했으나, 스케일링되는 WebRTC 서버의 가변적인 Public IP로 인해 내부망 허용 IP 관리에 어려움이 있었음
  - 고정 IP Pool 관리 방식과 TURN 서버 도입 방식 중, 고정 IP Pool 관리 방식을 채택함
  - 당시 전화 서비스는 채널톡 신규 기능으로 안정화가 좀 더 필요한 단계였는데, 새로운 서버를 도입하는 것과 홉이 늘어나는 것에 대해 회의적이었음
  - 이러한 이유로 특정 대역의 AWS Elastic IP Pool을 확보하고 WebRTC 서버의 InitContainer에서 EIP를 동적으로 할당하도록 구성함
- 기술 부채

  - EIP 할당 과정에서 여러 서버가 동시에 EIP를 가져오는 경우, 할당 가능한 EIP임을 판단하는 시점과 network interface에 할당되는 시점에 시간차가 있기 때문에 분산락과 같은 동시성 문제를 인지하고 있었음
  - 하지만 내부망 고객사의 전화 서비스 이용 시트가 한정적이고, WebRTC 서버가 동시에 2대 이상 스케일 아웃되는 경우가 드물 것으로 예상하여 해당 기술 부채를 안고 가는 전략을 선택
  - 운영 측면에서는 잠재적인 트래픽 급증에 대비하기 위해 스케일링 기준을 완화하고, 이슈 발생 시 즉각적인 인지를 위한 알람을 설정하여 서비스 안정성을 확보함

  - EIP 할당 과정에서 여러 서버가 동시에 EIP를 가져오는 경우, 할당 가능한 EIP임을 판단하는 시점과 network interface에 할당되는 시점에 시간차가 있기 때문에 동시성 문제가 발생할 수 있었음
  - Redis를 활용한 분산 스핀락을 구현하여 EIP 할당부터 유효성 검증까지 전 과정의 안정성을 확보하고, 동시성 문제를 해결함

#### 아키텍처 설계

- MSA 구조로 전환하기 위한 설계
  외부(고객사의 컴퓨터, 고객사의 물리 전화, 엔드 유저의 통신사)와 통신하는 서버들을 고려한 토폴로지 설계
  확장성과 가용성을 고려하여 RTP 프로토콜 중계 서버 제안
  Peer와 직접 통신하는 서버의 경우 hostNetwork를 사용하여 노드의 특정 UDP 대역을 사용하도록 설정
  통신사와 고정된 Port로 통신하기 위해 SNAT를 비활성화하는 CNI Plugin 설정 적용
  Media 서버의 요청 타입 및 내부 알고리즘을 고려하여 로드 밸런싱 & 오토 스케일링 되도록 최적화
  전화 연동 관련 인프라 CI/CD 파이프라인 구성, Helm Chart 작성 및 배포

#### 내부망 고객사를 위한 WebRTC 서버 EIP 동적 할당 시스템 구축

- 배경
  - 내부망을 사용하는 고객사는 방화벽으로 인해 전화 서비스 이용이 제한되었음
  - 스케일링되는 WebRTC 서버의 가변적인 Public IP로 인해 특정 IP만을 허용할 수 없는 상황
- 해결
  - 고정 IP Pool 관리 방식과 TURN 서버 도입 방식 중, 고정 IP Pool 관리 방식을 채택
  - 당시 전화 서비스는 채널톡 신규 기능으로 안정화가 좀 더 필요한 단계였는데, 새로운 서버를 도입하는 것과 홉이 늘어나는 것에 대해 회의적이었음
  - 이러한 이유로 특정 대역의 AWS Elastic IP Pool을 확보하고 WebRTC 서버의 InitContainer에서 EIP를 동적으로 할당하도록 구성함
  - EIP 할당 과정에서 발생할 수 있는 동시성 문제를 해결하기 위해 Redis를 활용한 분산 스핀락을 구현하여 EIP 할당부터 유효성 검증까지 전 과정의 안정성을 확보
  - 운영 측면에서는 잠재적인 트래픽 급증에 대비하기 위해 스케일링 기준을 완화하고, 이슈 발생 시 즉각적인 인지를 위한 알람을 설정하여 서비스 안정성을 확보함

---

- ECS -> EKS 마이그레이션

  - ECS에서는 CloudMap과 LB를 혼용해서 사용하다가, EKS로 옮길 땐 LB로 모두 옮긴 후 TargetGroup의 weight를 조절하며 마이그레이션을 수행함
  - DynamoDB Streams로 업데이트하던 인메모리 데이터베이스를 중단 없이 마이그레이션하였습니다
    기존의 무거웠던 AWS Lambda의 역할을 나누었음
    특정 비즈니스 모델을 기준으로 DB를 나누었음
    아래의 순서대로 함
    1. Cloud Map을 사용하던걸 ALB로 옮김
    2. EKS에 인스턴스를 준비하고 DynamoDB Streams를 ECS와 EKS 동시에 흘러들어가도록 함
    3. url path와 Header를 활용하여 내부 특정 채널만을 대상으로 EKS로 마이그레이션된 DB에 대해 테스트함
    4. 모니터링하며 ALB listener rule의 weight를 조절하여 1주에 걸쳐 마이그레이션을 완료함
       DB 컨테이너당 하나의 타입만 지원하는 특성을 고려하여, topologySpreadConstraints로 서로 다른 타입의 컨테이너는 다른 인스턴스에 스케줄링되도록 하여 가용성을 확보함

- whisper spot으로 돌린 썰
  실시간성을 보장하지 않아도 되는 서비스 특성 상 queue에 넣고 모두 spot으로 돌림
  크기가 큰 모델 빠르게 올리기
  spot을 사용하기 때문에 인스턴스 kubelet의 이미지 캐싱을 활용하기에는 어려웠음
  볼륨 스냅샷을 활용해서 인스턴스 프로비저닝시 마운트하는 방법 (disk iops or network bandwidth)
  모델이 포함된 AMI 빌드해서 사용
  동일한 기능을 제공하는 Saas보다 훨씬 적은 비용으로 운영 중

---

### Terraform

#### terraform module to s3 and versioning & seperate states

    - 문제점
        - 환경별로 분리된 state가 너무 커서 전체 plan 시간이 오래걸렸고, 그러다보니 target을 지정해서 작업하게 됨. 작업자가 여럿이고 싱크를 놓치는 경우가 쌓이며 생산성이 저하됨
        - Region별로 state가 분리되어 있었음
        - 모든 환경에서 모듈을 공통으로 사용하기 때문에, 모듈 수정에 대한 부담이 굉장히 컸음
        - 팀원들은 환경별 권한이 다르기 때문에 production 환경에 대한 작업인 경우 상급자가 보틀넥이 되었음
        - CI/CD 파이프라인의 부재로 동시에 여러명이 작업하기 불편했음
        - 중복 코드가 너무 많았음
    - 해결
        - Terragrunt를 도입하여 state를 세부적으로 나누고, 여러 작업자가 다른 환경에 동시에 작업 가능하도록 개선
        - Terragrunt 도입과 Git Repository 구조 변경으로 Account, Region, Stage 등 특정 범위 내에서 코드를 재사용할 수 있도록 개선
        - 모듈을 버저닝하여 AWS S3에서 관리하도록 함
        - CI/CD 도구로써 Atlantis를 도입함. atlantis와 terragrunt가 포함된 이미지를 직접 빌드하여 사용함
        - atlantis에서 권한 확인을 위한 tool을 Go로 개발함. Github Webhook에서 확인 가능한 정보를 Okta에서 관리하는 기준에 맞춰 인가 여부를 판단함

#### Atlantis CI/CD w/Terragrunt

- atlantis-permission-checker
