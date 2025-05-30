---
name: 정지원
avatar: /static/images/avatar.png
occupation: DevOps Engineer
company: Channel.io
email: jwjeong127@gmail.com
linkedin: https://www.linkedin.com/in/jwjeong
github: https://github.com/Jivvon
---

# Objective

4년차 DevOps 엔지니어 정지원입니다. 서비스 아키텍처를 고민 및 설계하는 것을 좋아하며 개발 프로세스를 개선하기 위해 노력하고 있습니다.

# Experience

### 채널코퍼레이션 - DevOps Engineer [2022.05 ~ 재직 중]

**보안**

- 사용자 관리
  - AWS Config를 활용하여 Access Key와 Secret Key에 대한 key rotate rule 설정
  - 서비스별 특징에 따라 접근 가능한 범위를 세분화하여 IP 제한 및 MFA 설정을 강제하는 Policy 적용
  - Okta를 SSOT(Single Source of Truth)로 하여 Grafana, ArgoCD, Argo Workflows 등 OIDC 적용
- 내부 관리 페이지에서 특정 IP에 대한 접근을 차단하기 위해 AWS WAF를 래핑한 API 서버 개발

<br/>

**비용 효율화**

- AWS 리소스 정리
  - Terraform aws provider에 default 태그를 추가하여 리소스 추적
  - Terraform으로 관리되지 않는 리소스의 경우 AWS Config를 활용하여 자동으로 정리되도록 설정
- Karpenter Spot 인스턴스

<br/>

**채널톡 [전화 연동](https://channel.io/ko/meet/call) 인프라 개선 및 관리 [2024.04 ~ 2025.03]**

- WebRTC 서버 업그레이드를 위한 설계
  - 비즈니스 영향도를 고려한 카나리 배포 전략 채택
  - 애플리케이션 수준에서 서로 다른 버전의 WebRTC 서버와 통신할 수 있는 구조 제안
  - 무중단 배포와 원활한 롤백 전략을 고려
- MSA 구조로 전환하기 위한 설계 (2025.03)
  - 외부(고객사의 컴퓨터, 고객사의 물리 전화, 엔드 유저의 통신사)와 통신하는 서버들을 고려한 토폴로지 설계
  - 확장성과 가용성을 고려하여 RTP 프로토콜 중계 서버 제안

<br/>

**채널톡 [전화 연동](https://channel.io/ko/meet/call) 인프라 구성 [2023.02 ~ 2023.12]**

- Peer와 직접 통신하는 서버의 경우 hostNetwork를 사용하여 노드의 특정 UDP 대역을 사용하도록 설정
- 통신사와 고정된 Port로 통신하기 위해 SNAT를 비활성화하는 CNI Plugin 설정 적용
- Media 서버의 요청 타입 및 내부 알고리즘을 고려하여 로드 밸런싱 & 오토 스케일링 되도록 최적화
- 전화 연동 관련 인프라 CI/CD 파이프라인 구성, Helm Chart 작성 및 배포

_Tech Skills. `EKS` `WebRTC`_

<br/>

**Terraform 프로젝트 및 개발 환경 개선 [2024.07 ~ 2024.12]**

- 멀티 리전, 멀티 클러스터를 고려하여 팀원 전체가 공동 작업 가능한 프로젝트 형태로 개선
- Terragrunt를 도입하여 동일한 어카운트나 리전 등 특정 범위 내에서 동일한 값을 재사용 하도록 개선
- Atlantis를 사용하여 CI & CD를 자동화하고, state를 세부적으로 나누어 여러 작업자가 다른 환경에 동시에 작업 가능하도록 개선
- 작업자들의 권한을 세부적으로 관리하기 위한 tool을 개발하여 적용
- 모든 의사결정 사항을 문서화하여 팀 내 공유

**EKS 모니터링 시스템 구축 [2023.06 ~ 2023.07]**

- 각 Exporter와 Prometheus, Grafana를 활용하여 메트릭 수집 및 시각화
- Thanos를 활용하여 가용성 확보 및 메트릭 장기 저장
- Promtail, Loki, Grafana를 활용하여 로그 수집 및 시각화
- 특정 로그 발생시 채널톡으로 알람을 보내주는 Webhook 서버 및 AWS Lambda 개발

_Tech Skills. `Kubernetes` `Helm` `Prometheus` `Loki` `Grafana` `Go`_

<br/>

**Terraform 리팩토링 및 모듈화 [2022.10 ~ 2023.02]**

- 기본적으로 Terraform AWS 모듈을 사용하고, 상황에 따라 수정하거나 새로 개발하여 사용
- 동일한 형태가 반복되는 경우에는 yaml에서 가져오도록 수정
- 패턴화된 Security Group Rule을 그룹화하여 가독성 및 유지보수성 향상
- 내부 모듈 저장소(S3)를 사용할 예정 (TO-BE)
  - 모듈 변경이 필요할 때, 해당 모듈을 사용하는 다른 state에 영향을 미치지 않게 하기 위해 모듈의 버전 관리가 필요함
  - 현재는 환경별 브랜치를 구분하여 사용 중 → 동일한 작업을 환경별로 반복해야 함
  - 단일 Git 저장소에 모아놓고 모듈의 source에 Github scheme을 사용 → plan, apply시 Git 저장소 전체를 가져오기 때문에 오래 걸림
  - S3에 모듈을 버전별로 올려놓고 terraform 명령시 해당 모듈을 받아오는 툴을 개발하여 사용 → 개발 필요

_Tech Skills. `Terraform`_

<br/>

**EKS 환경 셋업 & ECS → EKS 마이그레이션 환경 구성 [2022.07 ~ 2022.09]**

- 어플리케이션 Helm Chart 작성
- Cluster Autoscaler를 활용하여 Node 오토스케일링, HPA를 활용하여 Pod 오토스케일링 적용
- External DNS를 활용하여 Route53과 CloudMap 설정
- AWS Load Balancer Controller의 TargetGroupBinding을 사용하는 차트 작성 및 ELB와 TG는 Terraform으로 생성
- ArgoCD를 이용하여 GitOps 방식의 CD 구현
- 개발용 서버 인프라를 ECS에서 EKS로 마이그레이션

_Tech Skills. `EKS` `Helm` `Terraform` `ArgoCD` `AWS Route53` `AWS CloudMap`_

<br/>

**CI/CD 파이프라인 빌드 개선 [2022.06 ~ 2022.07]**

- 주요 어플리케이션의 CI 파이프라인에서 Docker buildx를 활용하여 멀티 아키텍처 빌드를 하도록 개선
- 캐싱, Graceful Shutdown, 런타임 이미지 경량화를 고려하여 Dockerfile 개선 및 CI 개선

_Tech Skills. `Docker` `CircleCI`_

---

## SI Analytics - DevOps Engineer [2021.03 ~ 2022.02]

<br/>

**쿠버네티스 클러스터 운영**

온프레미스 환경에서 총 21대의 물리 서버와 44대의 VM으로 구성된 5개의 Kubernetes 클러스터를 관리하였습니다.

- **OPA Gatekeeper를 활용하여 Admission Control 적용**
  - previleged mode나 루트 계정으로 컨테이너를 생성하지 못하도록 제한하는 정책 적용
  - [gatekeeper-library](https://github.com/open-policy-agent/gatekeeper-library)에서 가져와 조건을 수정한 후 RBAC 관련 helm chart에 포함시켜 적용
- **클러스터 접근제어 환경 구축 및 설정 (User Account, RBAC, OPA Gatekeeper)**
  - RBAC를 활용한 Helm chart 작성
    - Rolebinding / ClusterRolebinding : 공통 values에서 그룹별 사용자를 정의하고 각 ClusterRole에서 그룹을 할당하는 방식으로 사용
    - ClusterRole : 기본 권한을 기반으로 필요에 따라 aggregate를 활용하여 권한 추가 가능
- **모델 학습 및 서빙을 위한 환경 구성**
  - 사내 및 IDC에 각각 A100, V100을 포함한 GPU 머신으로 클러스터를 구축하고 모델 학습 및 서빙 파이프라인을 구성하여 연구자들의 연구 환경을 대폭 개선함
  - (AS-IS) 스케줄을 작성하고 연구자들이 돌아가며 GPU 인스턴스에 직접 접속하여 학습 -> (TO-BE) mlflow, minio와 더불어 팀 내에서 자체 개발한 모델 학습 스케줄러를 이용하여 여러 팀원들이 비동기식으로 GPU 자원을 사용함
    - (AS-IS) 스케줄을 협의하는 커뮤니케이션 비용이 상당하였으며, 스케줄 사이의 시간, 할당되었지만 남은 시간 등 GPU를 사용하지 않는 시간이 약 15%~20% 정도 되었음
    - (TO-BE) 모든 연구자들이 비동기식으로 학습을 요청하며, 작은 단위로 나누어진 작업들은 우선순위에 따라 자동으로 스케줄링되어 작업자의 피로도는 감소하고, GPU는 밤낮, 주말 내내 100% 사용률을 유지하였음

_Tech Skills. `Kubernetes` `Helm` `ArgoCD` `Prometheus` `Loki` `Grafana` `OPA`_

<br/>

**모니터링 시스템 구축 및 운영 [2021.03 ~ 2022.02]**

- 메트릭, 로그, 알림 흐름
  - 메트릭은 각 Exporter → Prometheus → Grafana 흐름으로 메트릭을 수집 및 저장하여 시각화
  - 로그는 각 노드의 Promtail → Loki → Grafana 흐름으로 로그를 수집 및 저장하여 시각화
  - 알림은 Prometheus → Alertmanager → Prometheus-msteams → MS Teams 흐름으로 알림 발생
- Prometheus Operator를 사용하여 가용성을 높이고 동적으로 설정이 적용되도록 구성
  - 모니터링 대상이나 Alert rule이 변경되면, 이를 보고 있던 Prometheus Operator가 설정 파일을 수정하여 적용
  - Prometheus 서버와 AlertManager를 이중화하여 서비스의 가용성을 높임
- DCGM Exporter에서 수집하는 메트릭의 레이블에 GPU 모델명을 추가하여 사내에 제공하고 공식 레포에 PR 생성 [[링크](https://gitlab.com/nvidia/container-toolkit/gpu-monitoring-tools/-/merge_requests/71)]

_Tech Skills. `Kubernetes` `Helm` `Prometheus` `Loki` `Grafana` `Go`_

<br/>

**쿠버네티스 환경 백업 및 복원 시스템 구축 [2021.09 ~ 2022.10]**

쿠버네티스 클러스터의 모든 리소스와 주요 서비스를 백업 및 복원하는 시스템을 구축하였습니다.

- Harbor: Database 덤프를 생성하는 스크립트 작성 후 cronjob으로 실행
- ETCD: Etcdctl을 이용하여 스냅샷 생성하는 스크립트 작성 후 cronjob으로 실행
- K8S Resources: velero를 이용하여 주기적으로 네임스페이스별 모든 리소스를 Minio에 백업

_Tech Skills. `Kubernetes` `Helm` `Shell` `ArgoCD` `Harbor` `Velero` `Minio`_

<br/>

**쿠버네티스 클러스터 재구축 및 마이그레이션 [2021.11 ~ 2022.02]**

- Control Plane 노드 3대와 HAProxy를 이용하여 고가용성 구성
- 개발용 클러스터 구축
- 클러스터별 접근제어 환경 구축 및 설정 (User Account, RBAC, OPA Gatekeeper)
- 사내 운영 서비스(Harbor, Minio, Grafana, Prometheus, Loki) 배포
- HCI VM과 Subnet을 관리할 수 있는 Terraform 모듈 작성

_Github. [https://github.com/Jivvon/nutanix-terraform-modules](https://github.com/Jivvon/nutanix-terraform-modules)_

_Tech Skills. `Kubernetes` `Helm` `Shell` `Terraform`_
