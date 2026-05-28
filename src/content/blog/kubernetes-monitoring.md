---
title: "Kubernetes Monitoring"
date: 2026-05-01
description: "Kubernetes Monitoring"
tags: [kubernetes, monitoring, prometheus]
draft: false
---

# Production-Ready Kubernetes Monitoring with kube-prometheus-stack

*A comprehensive guide to implementing enterprise-grade monitoring in Kubernetes*

---

## Introduction

Monitoring is the backbone of any production Kubernetes environment. Without proper observability, you're essentially flying blind. In this post, I'll walk you through setting up a production-ready monitoring stack using **kube-prometheus-stack** — the de facto standard for Kubernetes monitoring.

We'll cover:
- Architecture deep-dive
- Multi-namespace dashboard provisioning
- Grafana plugin management
- Resource optimization strategies
- Best practices from real-world implementations

---

## Architecture Overview

The kube-prometheus-stack bundles several components into a cohesive monitoring solution:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           KUBERNETES CLUSTER                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        MONITORING NAMESPACE                               │   │
│  │                                                                           │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────────┐  │   │
│  │   │             │    │             │    │         GRAFANA             │  │   │
│  │   │ PROMETHEUS  │◄───│ALERTMANAGER │    │  ┌─────────────────────┐   │  │   │
│  │   │             │    │             │    │  │    Dashboard        │   │  │   │
│  │   │  - Scrape   │    │  - Routes   │    │  │    Sidecar          │   │  │   │
│  │   │  - Store    │    │  - Alerts   │    │  │    (watches ALL     │   │  │   │
│  │   │  - Query    │    │  - Notify   │    │  │     namespaces)     │   │  │   │
│  │   │             │    │             │    │  └──────────┬──────────┘   │  │   │
│  │   └──────▲──────┘    └─────────────┘    └─────────────┼──────────────┘  │   │
│  │          │                                            │                  │   │
│  └──────────┼────────────────────────────────────────────┼──────────────────┘   │
│             │                                            │                       │
│             │ scrapes metrics                            │ watches ConfigMaps    │
│             │                                            │ with label:           │
│             ▼                                            │ grafana_dashboard=1   │
│  ┌──────────────────────┐                                │                       │
│  │   SERVICE MONITORS   │                                │                       │
│  │  ┌────────────────┐  │                                │                       │
│  │  │ kube-state-    │  │                                │                       │
│  │  │ metrics        │  │                                ▼                       │
│  │  ├────────────────┤  │    ┌───────────────────────────────────────────────┐  │
│  │  │ node-exporter  │  │    │              ALL NAMESPACES                    │  │
│  │  ├────────────────┤  │    │                                                │  │
│  │  │ kubelet/       │  │    │  ┌─────────────┐  ┌─────────────┐  ┌────────┐ │  │
│  │  │ cAdvisor       │  │    │  │  APP-A NS   │  │  APP-B NS   │  │ APP-C  │ │  │
│  │  ├────────────────┤  │    │  │             │  │             │  │   NS   │ │  │
│  │  │ app metrics    │  │    │  │ ConfigMap   │  │ ConfigMap   │  │        │ │  │
│  │  └────────────────┘  │    │  │ (dashboard) │  │ (dashboard) │  │  ...   │ │  │
│  └──────────────────────┘    │  └─────────────┘  └─────────────┘  └────────┘ │  │
│                              └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Purpose | Key Metrics |
|-----------|---------|-------------|
| **Prometheus** | Time-series database & query engine | All metrics |
| **Alertmanager** | Alert routing & notification | Alert states |
| **Grafana** | Visualization & dashboards | N/A |
| **kube-state-metrics** | Kubernetes object states | `kube_*` metrics |
| **node-exporter** | Node-level metrics | `node_*` metrics |
| **Prometheus Operator** | Manages Prometheus CRDs | N/A |

---

## Multi-Namespace Dashboard Provisioning

One of the most powerful features is allowing applications to deploy their own dashboards. Here's how it works:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DASHBOARD DISCOVERY FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

     APP-A Namespace              APP-B Namespace              monitoring NS
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │   ConfigMap     │         │   ConfigMap     │         │   ConfigMap     │
    │                 │         │                 │         │                 │
    │ labels:         │         │ labels:         │         │ labels:         │
    │  grafana_       │         │  grafana_       │         │  grafana_       │
    │  dashboard: "1" │         │  dashboard: "1" │         │  dashboard: "1" │
    │                 │         │                 │         │                 │
    │ annotations:    │         │ annotations:    │         │ annotations:    │
    │  grafana_folder:│         │  grafana_folder:│         │  grafana_folder:│
    │  "App-A"        │         │  "App-B"        │         │  "Infrastructure│
    └────────┬────────┘         └────────┬────────┘         └────────┬────────┘
             │                           │                           │
             │                           │                           │
             └───────────────────────────┼───────────────────────────┘
                                         │
                                         ▼
                            ┌────────────────────────┐
                            │   GRAFANA SIDECAR      │
                            │                        │
                            │  searchNamespace: ALL  │
                            │  label: grafana_       │
                            │         dashboard      │
                            │  labelValue: "1"       │
                            │  folderAnnotation:     │
                            │    grafana_folder      │
                            └───────────┬────────────┘
                                        │
                                        ▼
                            ┌────────────────────────┐
                            │       GRAFANA UI       │
                            │                        │
                            │  📁 App-A/             │
                            │     └── app-a-dash     │
                            │  📁 App-B/             │
                            │     └── app-b-dash     │
                            │  📁 Infrastructure/    │
                            │     └── infra-dash     │
                            └────────────────────────┘
```

### Configuration

```yaml
grafana:
  sidecar:
    dashboards:
      enabled: true
      label: grafana_dashboard
      labelValue: "1"
      searchNamespace: ALL              # Watch all namespaces
      folderAnnotation: grafana_folder  # Use annotation for folder organization
```

### Example: App Deploying Its Own Dashboard

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-grafana-dashboard
  namespace: myapp                      # App's own namespace
  labels:
    grafana_dashboard: "1"              # Required: Identifies as dashboard
  annotations:
    grafana_folder: "MyApp"             # Optional: Folder in Grafana
data:
  myapp-dashboard.json: |
    {
      "title": "MyApp Dashboard",
      "panels": [...],
      ...
    }
```

### How Dynamic Folder Creation Works

A common question: *"If the app specifies a folder after kube-prometheus-stack is deployed, how does the folder get created?"*

The answer: **The sidecar handles folder creation dynamically at runtime!**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        RUNTIME FLOW (No restart needed!)                      │
└──────────────────────────────────────────────────────────────────────────────┘

    TIME ──────────────────────────────────────────────────────────────────►

    T0: kube-prometheus-stack deployed
         │
         ▼
    ┌─────────────────────────────────────────┐
    │  Grafana running with sidecar           │
    │  Sidecar watching ALL namespaces        │
    │  for ConfigMaps with label:             │
    │  grafana_dashboard: "1"                 │
    └─────────────────────────────────────────┘
         │
         │  (days/weeks later...)
         │
    T1: App deploys ConfigMap
         │
         ▼
    ┌─────────────────────────────────────────┐
    │  kubectl apply -f dashboard.yaml        │
    │  (in app's namespace)                   │
    │                                         │
    │  annotations:                           │
    │    grafana_folder: "NewAppFolder"       │
    └─────────────────────────────────────────┘
         │
         │  (within seconds)
         │
         ▼
    ┌─────────────────────────────────────────┐
    │  SIDECAR DETECTS NEW CONFIGMAP          │
    │                                         │
    │  1. Sees grafana_dashboard: "1" label   │
    │  2. Reads grafana_folder annotation     │
    │  3. Checks if folder exists in Grafana  │
    │     - If NO  → Creates folder via API   │
    │     - If YES → Uses existing folder     │
    │  4. Provisions dashboard into folder    │
    └─────────────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────┐
    │  GRAFANA UI                             │
    │                                         │
    │  📁 General/                            │
    │  📁 Infrastructure/                     │
    │  📁 NewAppFolder/     ◄── Auto-created! │
    │     └── app-dashboard                   │
    └─────────────────────────────────────────┘
```

#### Sidecar Behavior Summary

The sidecar is a **continuously running container** alongside Grafana that:

1. **Watches** Kubernetes API for ConfigMap changes (create/update/delete)
2. **Filters** by label (`grafana_dashboard: "1"`)
3. **Reads** the `grafana_folder` annotation
4. **Calls Grafana API** to create folder if it doesn't exist
5. **Provisions** the dashboard JSON into that folder
6. **Syncs** changes (if ConfigMap is updated, dashboard is updated)

#### Folder Creation FAQ

| Question | Answer |
|----------|--------|
| When is folder created? | **Dynamically** when sidecar detects the ConfigMap |
| Need to restart Grafana? | **No** - sidecar handles it live |
| Need to pre-create folders? | **No** - created automatically |
| What if folder exists? | Dashboard added to existing folder |
| What if ConfigMap deleted? | Dashboard removed from Grafana |
| What if no annotation? | Dashboard goes to "General" folder |

#### Verification Commands

```bash
# Check sidecar is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana \
  -o jsonpath='{.items[0].spec.containers[*].name}'
# Output: grafana grafana-sc-dashboard grafana-sc-datasources

# Check sidecar logs for dashboard sync activity
kubectl logs -n monitoring -l app.kubernetes.io/name=grafana \
  -c grafana-sc-dashboard --tail=50

# Test dynamic folder creation
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-dashboard
  namespace: default
  labels:
    grafana_dashboard: "1"
  annotations:
    grafana_folder: "TestFolder-AutoCreated"
data:
  test.json: |
    {
      "title": "Test Dashboard",
      "uid": "test-auto-folder",
      "panels": [],
      "schemaVersion": 39
    }
EOF

# Check Grafana UI - folder should appear within seconds!
# Cleanup: kubectl delete configmap test-dashboard -n default
```

### Application Responsibility Summary

| Component | Responsibility |
|-----------|---------------|
| **kube-prometheus-stack** | Enable sidecar, configure `searchNamespace: ALL`, set `folderAnnotation` |
| **Application Team** | Add correct labels and `grafana_folder` annotation to ConfigMap |
| **Grafana Sidecar** | Watch ConfigMaps, create folders, provision dashboards automatically |

**Key Insight:** Applications own their dashboards and decide which folder they belong to. The monitoring stack just provides the infrastructure to make it work seamlessly.

---

## Grafana Plugin Management

### The Challenge

Grafana plugins are typically downloaded from grafana.com at startup. This causes issues in:
- Air-gapped environments
- Slow/unreliable networks
- Environments where pods restart frequently

### Solution: Init Container Approach

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PLUGIN INSTALLATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────┘

                         POD STARTUP
                              │
                              ▼
               ┌──────────────────────────────┐
               │     INIT CONTAINER           │
               │     (install-plugins)        │
               │                              │
               │  1. Check if plugin exists   │
               │     on PVC                   │
               │                              │
               │  2. If not, download from    │◄──────  grafana.com
               │     grafana.com              │
               │                              │
               │  3. Extract to /var/lib/     │
               │     grafana/plugins/         │
               └──────────────┬───────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │     MAIN CONTAINER           │
               │     (grafana)                │
               │                              │
               │  Plugins already installed   │
               │  on PVC - no download needed │
               │                              │
               └──────────────────────────────┘
                              │
                              ▼
               ┌──────────────────────────────┐
               │     PERSISTENT VOLUME        │
               │     (NFS)                    │
               │                              │
               │  /var/lib/grafana/plugins/   │
               │  ├── grafana-clock-panel/    │
               │  ├── grafana-piechart-panel/ │
               │  ├── yesoreyeram-infinity/   │
               │  └── ...                     │
               │                              │
               │  Survives pod restarts!      │
               └──────────────────────────────┘
```

### Configuration

```yaml
grafana:
  extraInitContainers:
    - name: install-plugins
      image: curlimages/curl:8.5.0
      command: ["sh", "-c"]
      args:
        - |
          PLUGIN_DIR="/var/lib/grafana/plugins"
          PLUGINS="grafana-clock-panel grafana-piechart-panel ..."
          
          for plugin in $PLUGINS; do
            # Skip if already installed (smart caching)
            if [ -d "${PLUGIN_DIR}/${plugin}" ]; then
              echo "[SKIP] ${plugin} - already installed"
              continue
            fi
            # Download and extract
            curl -L "https://grafana.com/api/plugins/${plugin}/..." -o /tmp/plugin.zip
            unzip /tmp/plugin.zip -d ${PLUGIN_DIR}/
          done
      volumeMounts:
        - name: storage
          mountPath: /var/lib/grafana
```

### Benefits

| Approach | First Deploy | Restart | Air-Gapped | Network Issues |
|----------|--------------|---------|------------|----------------|
| GF_INSTALL_PLUGINS | Downloads | Downloads again | ❌ Fails | ❌ Fails |
| Init Container + PVC | Downloads | **Skips** | ✅ Works* | ✅ Works |

*With pre-downloaded plugins

---

## Resource Optimization

### The Problem

Most teams set arbitrary resource requests/limits:

```yaml
resources:
  requests:
    cpu: "500m"      # Why 500m? 🤷
    memory: "512Mi"  # Why 512Mi? 🤷
```

### Data-Driven Approach

Use actual usage data to right-size your containers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   RESOURCE OPTIMIZATION WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

    COLLECT                    ANALYZE                    APPLY
       │                          │                          │
       ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Prometheus     │    │  Calculate P95  │    │  Update specs   │
│  Metrics        │───▶│  Usage Patterns │───▶│  with buffer    │
│                 │    │                 │    │                 │
│ container_cpu_  │    │ CPU Request =   │    │ requests:       │
│ usage_seconds_  │    │ P95 + 20%       │    │   cpu: 150m     │
│ total           │    │                 │    │   memory: 200Mi │
│                 │    │ Memory Request =│    │ limits:         │
│ container_      │    │ P95 + 20%       │    │   cpu: 500m     │
│ memory_working_ │    │                 │    │   memory: 300Mi │
│ set_bytes       │    │ Memory Limit =  │    │                 │
│                 │    │ P99 + 25%       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key PromQL Queries

**CPU Usage vs Requests (find over-provisioned pods):**
```promql
sum by (namespace,pod,container) (
  rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m])
)
/
sum by (namespace,pod,container) (
  kube_pod_container_resource_requests{resource="cpu"}
)
```

**Memory Usage vs Limits (OOM risk):**
```promql
sum by (namespace,pod,container) (
  container_memory_working_set_bytes{container!="",container!="POD"}
)
/
sum by (namespace,pod,container) (
  kube_pod_container_resource_limits{resource="memory"}
)
```

**CPU Throttling (performance impact):**
```promql
sum by (namespace,pod,container) (
  rate(container_cpu_cfs_throttled_periods_total[5m])
)
/
sum by (namespace,pod,container) (
  rate(container_cpu_cfs_periods_total[5m])
)
```

### Sizing Guidelines

| Resource | Request | Limit |
|----------|---------|-------|
| **CPU** | P95 usage + 20% buffer | 2-3x requests (or no limit) |
| **Memory** | P95 usage + 20% buffer | P99 usage + 25% (always set!) |

---

## Dashboard Migration: Fixing Deprecated Metrics

Modern Kubernetes versions have changed several metric names:

### Metric Migration Table

| Old (Deprecated) | New (Current) | Affected Dashboards |
|-----------------|---------------|---------------------|
| `container_name` | `container` | Most cAdvisor-based |
| `pod_name` | `pod` | Most cAdvisor-based |
| `container_spec_cpu_quota` | `kube_pod_container_resource_limits{resource="cpu"}` | Capacity planning |
| `container_spec_memory_limit_bytes` | `kube_pod_container_resource_limits{resource="memory"}` | Capacity planning |
| `name=~"^k8s_.*"` | (remove filter) | Docker-specific |

### Before/After Example

**Before (broken):**
```promql
sum(container_memory_usage_bytes{container_name!="POD"}) by (pod_name)
```

**After (working):**
```promql
sum(container_memory_working_set_bytes{container!="POD"}) by (pod)
```

---

## Complete Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   KUBERNETES CLUSTER                                    │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              MONITORING NAMESPACE                                  │ │
│  │                                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                            PROMETHEUS STACK                                  │  │ │
│  │  │                                                                              │  │ │
│  │  │   ┌──────────────┐      ┌──────────────┐      ┌──────────────────────────┐  │  │ │
│  │  │   │              │      │              │      │         GRAFANA          │  │  │ │
│  │  │   │  PROMETHEUS  │      │ ALERTMANAGER │      │                          │  │  │ │
│  │  │   │              │      │              │      │  ┌────────────────────┐  │  │  │ │
│  │  │   │ ┌──────────┐ │      │ ┌──────────┐ │      │  │  INIT CONTAINER    │  │  │  │ │
│  │  │   │ │ TSDB     │ │      │ │ Routing  │ │      │  │  (plugin install)  │  │  │  │ │
│  │  │   │ │ 15d ret. │ │      │ │ Silences │ │      │  └─────────┬──────────┘  │  │  │ │
│  │  │   │ │ 45GB     │ │      │ │ Notify   │ │      │            │             │  │  │ │
│  │  │   │ └──────────┘ │      │ └──────────┘ │      │  ┌─────────▼──────────┐  │  │  │ │
│  │  │   │              │      │              │      │  │  SIDECAR           │  │  │  │ │
│  │  │   │ Resources:   │      │ Resources:   │      │  │  (dashboard watch) │  │  │  │ │
│  │  │   │ 2Gi-4Gi mem │      │ 128Mi-256Mi  │      │  │  searchNS: ALL     │  │  │  │ │
│  │  │   │ 500m-2 CPU  │      │ 50m-200m CPU │      │  └─────────┬──────────┘  │  │  │ │
│  │  │   └──────────────┘      └──────────────┘      │            │             │  │  │ │
│  │  │                                               │  ┌─────────▼──────────┐  │  │  │ │
│  │  │                                               │  │  MAIN CONTAINER    │  │  │  │ │
│  │  │                                               │  │  256Mi-512Mi mem   │  │  │  │ │
│  │  │                                               │  │  100m-500m CPU     │  │  │  │ │
│  │  │                                               │  └────────────────────┘  │  │  │ │
│  │  │                                               └──────────────────────────┘  │  │ │
│  │  └─────────────────────────────────────────────────────────────────────────────┘  │ │
│  │                                                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────┐  │ │
│  │  │                           EXPORTERS & METRICS                                │  │ │
│  │  │                                                                              │  │ │
│  │  │   ┌──────────────┐      ┌──────────────┐      ┌──────────────────────────┐  │  │ │
│  │  │   │ KUBE-STATE-  │      │    NODE      │      │    PROMETHEUS            │  │  │ │
│  │  │   │   METRICS    │      │   EXPORTER   │      │     OPERATOR             │  │  │ │
│  │  │   │              │      │  (DaemonSet) │      │                          │  │  │ │
│  │  │   │ kube_pod_*   │      │              │      │  Manages:                │  │  │ │
│  │  │   │ kube_node_*  │      │ node_cpu_*   │      │  - ServiceMonitors       │  │  │ │
│  │  │   │ kube_deploy_*│      │ node_memory_*│      │  - PodMonitors           │  │  │ │
│  │  │   │              │      │ node_disk_*  │      │  - PrometheusRules       │  │  │ │
│  │  │   └──────────────┘      └──────────────┘      └──────────────────────────┘  │  │ │
│  │  └─────────────────────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              APPLICATION NAMESPACES                                │ │
│  │                                                                                    │ │
│  │   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐                 │ │
│  │   │    app-a NS     │   │    app-b NS     │   │    app-c NS     │    ...          │ │
│  │   │                 │   │                 │   │                 │                 │ │
│  │   │  ┌───────────┐  │   │  ┌───────────┐  │   │  ┌───────────┐  │                 │ │
│  │   │  │ ConfigMap │  │   │  │ ConfigMap │  │   │  │ ConfigMap │  │                 │ │
│  │   │  │ Dashboard │  │   │  │ Dashboard │  │   │  │ Dashboard │  │                 │ │
│  │   │  │           │  │   │  │           │  │   │  │           │  │                 │ │
│  │   │  │ label:    │  │   │  │ label:    │  │   │  │ label:    │  │                 │ │
│  │   │  │ grafana_  │  │   │  │ grafana_  │  │   │  │ grafana_  │  │                 │ │
│  │   │  │ dashboard │  │   │  │ dashboard │  │   │  │ dashboard │  │                 │ │
│  │   │  │ : "1"     │  │   │  │ : "1"     │  │   │  │ : "1"     │  │                 │ │
│  │   │  └───────────┘  │   │  └───────────┘  │   │  └───────────┘  │                 │ │
│  │   │                 │   │                 │   │                 │                 │ │
│  │   │  ┌───────────┐  │   │  ┌───────────┐  │   │  ┌───────────┐  │                 │ │
│  │   │  │    App    │  │   │  │    App    │  │   │  │    App    │  │                 │ │
│  │   │  │  Pods     │  │   │  │  Pods     │  │   │  │  Pods     │  │                 │ │
│  │   │  │ (metrics) │  │   │  │ (metrics) │  │   │  │ (metrics) │  │                 │ │
│  │   │  └───────────┘  │   │  └───────────┘  │   │  └───────────┘  │                 │ │
│  │   └─────────────────┘   └─────────────────┘   └─────────────────┘                 │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐ │
│  │                                  STORAGE                                           │ │
│  │                                                                                    │ │
│  │   ┌─────────────────────────────────────────────────────────────────────────────┐ │ │
│  │   │                         NFS STORAGE CLASS                                    │ │ │
│  │   │                                                                              │ │ │
│  │   │   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │ │ │
│  │   │   │ Prometheus   │      │   Grafana    │      │ Alertmanager │              │ │ │
│  │   │   │     PVC      │      │     PVC      │      │     PVC      │              │ │ │
│  │   │   │    50Gi      │      │    20Gi      │      │    10Gi      │              │ │ │
│  │   │   │              │      │ (+ plugins)  │      │              │              │ │ │
│  │   │   └──────────────┘      └──────────────┘      └──────────────┘              │ │ │
│  │   └─────────────────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Helm Values

```yaml
# values-production.yaml
grafana:
  enabled: true
  
  # Persistence for plugins and data
  persistence:
    enabled: true
    storageClassName: "nfs-client"
    size: 20Gi
  
  # Resource allocation
  resources:
    requests:
      memory: 256Mi
      cpu: 100m
    limits:
      memory: 512Mi
      cpu: 500m
  
  # Multi-namespace dashboard discovery
  sidecar:
    dashboards:
      enabled: true
      label: grafana_dashboard
      labelValue: "1"
      searchNamespace: ALL
      folderAnnotation: grafana_folder
  
  # Plugin installation via init container
  extraInitContainers:
    - name: install-plugins
      image: curlimages/curl:8.5.0
      # ... (see full config above)

prometheus:
  prometheusSpec:
    retention: 15d
    retentionSize: "45GB"
    resources:
      requests:
        memory: 2Gi
        cpu: 500m
      limits:
        memory: 4Gi
        cpu: 2000m

alertmanager:
  alertmanagerSpec:
    resources:
      requests:
        memory: 128Mi
        cpu: 50m
      limits:
        memory: 256Mi
        cpu: 200m
```

---

## Installation

```bash
# Add Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install/Upgrade
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -f values-production.yaml \
  -n monitoring --create-namespace
```

---

## Key Takeaways

1. **Use kube-prometheus-stack** — It's the industry standard with excellent defaults
2. **Enable multi-namespace dashboards** — Let apps own their observability
3. **Use init containers for plugins** — Reliable and survives restarts
4. **Right-size resources** — Use P95/P99 metrics, not guesswork
5. **Keep dashboards updated** — Metric names change between versions
6. **Persist everything** — Prometheus data, Grafana plugins, Alertmanager state

---

## Resources

- [kube-prometheus-stack GitHub](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Prometheus Operator](https://prometheus-operator.dev/)
- [Grafana Dashboard Library](https://grafana.com/grafana/dashboards/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

---

*Written from real-world production experience. Questions? Feel free to reach out!*
