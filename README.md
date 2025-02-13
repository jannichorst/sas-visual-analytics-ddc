# Deployment Guide for Static Web Server with NGINX in Kubernetes

## Step 1: Prepare Directories and Static Files

1. Navigate to your working directory on your server:

```sh
mkdir -p ~/static-web && cd ~/static-web
```

2. Create the required directories under `webserver/`:

```sh
mkdir -p /data/static/webserver/js
mkdir -p /data/static/webserver/css
mkdir -p /data/static/webserver/charts/sample-chart
```

3. Create the main `index.html` inside the `webserver/` folder:

```sh
nano /data/static/webserver/index.html
```

Paste this content:

```html
<!DOCTYPE html>
<html>
<head>
    <title>DDC Web Server</title>
    <link rel="stylesheet" type="text/css" href="css/style.css">
    <script src="js/custom-script.js"></script>
    <script>
        window.addEventListener("message", function(event) {
            if (event && event.data) {
                document.getElementById("output").innerText = JSON.stringify(event.data, null, 2);
            }
        });
    </script>
</head>
<body>
    <h1>DDC Web Server is Running</h1>
    <p>Static file serving via NGINX</p>
    <pre id="output">Waiting for data...</pre>
</body>
</html>
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

4. Create a `style.css` file inside the `css/` directory:

```sh
nano /data/static/webserver/css/style.css
```

Paste this content:

```css
body {
    font-family: Arial, sans-serif;
    background-color: #f4f4f4;
    text-align: center;
    padding: 20px;
}

h1 {
    color: #333;
}
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

5. Create a `custom-script.js` file inside the `js/` directory:

```sh
nano /data/static/webserver/js/custom-script.js
```

Paste this content:

```javascript
document.addEventListener("DOMContentLoaded", function() {
    console.log("Custom JavaScript Loaded!");
});
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

6. Download and store external JavaScript dependencies (e.g., D3.js) inside `js/`:

```sh
wget -P /data/static/webserver/js https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.4/d3.min.js
```

7. Create a sample chart page inside `/charts/sample-chart/`:

```sh
nano /data/static/webserver/charts/sample-chart/index.html
```

Paste this content:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Sample Chart</title>
    <script src="../../js/d3.min.js"></script>
    <script src="chart.js"></script>
</head>
<body>
    <h1>Sample D3.js Chart</h1>
    <div id="chart"></div>
</body>
</html>
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

8. Create the `chart.js` file inside `/charts/sample-chart/`:

```sh
nano /data/static/webserver/charts/sample-chart/chart.js
```

Paste this content:

```javascript
document.addEventListener("DOMContentLoaded", function() {
    const data = [10, 20, 30, 40, 50];
    const width = 400;
    const height = 200;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", (d, i) => i * 50)
        .attr("y", d => height - d * 4)
        .attr("width", 40)
        .attr("height", d => d * 4)
        .attr("fill", "steelblue");
});
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

---

After these steps the folder structure should look something like:

```bash
/data/static/webserver/
│── index.html            # Main entry point
│── charts/               # Chart collection
│   ├── sample-chart/     # Each chart gets its own subfolder
│   │   ├── index.html    # Chart page
│   │   ├── chart.js      # Chart logic
│── js/                   # Global JavaScript libraries and scripts
│   ├── d3.min.js         # D3.js dependency
│   ├── custom-script.js  # Sample custom script logic
│── css/                  # Stylesheets
│   ├── style.css         # Sample CSS file
```

## Step 2: Deploy to Kubernetes


1. Create a Kubernetes Namespace:

```sh
kubectl create namespace static-web
```

Variables for the deployment. Please check them and exchange for your enviroment. Not all variables are required for **Option B**.
| **YAML File**  | **Field**                          | **How to Determine / Set It** |
|---------------|----------------------------------|----------------------------------|
| **Deployment** | `namespace: static-web` | Run `kubectl get namespaces` to check if `static-web` exists. If not, create it: `kubectl create namespace static-web`. |
| **Deployment** | `server: sasserver.demo.sas.com` | This is your **NFS server hostname/IP**. If unsure, check with your infrastructure team or use `kubectl get nodes -o wide` for node IPs. |
| **Deployment** | `path: /data/static` | This is the **NFS export path**. If unsure, check your NFS server config: `exportfs -v`. |
| **Ingress** | `host: sasserver.demo.sas.com` | This is the **DNS name or IP** of your cluster. If using a custom domain, configure your **DNS records**. For quick testing, use the worker node's IP from `kubectl get nodes -o wide`. |
| **Service** | `name: webserver-nfs-service` | Must match the service name referenced in `ingress.yaml`. If changed, update it in both places. |


### OPTION A: Ingress
2. Create the Deployment YAML (`deployment.yaml`):

```sh
nano deployment.yaml
```

Paste this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: webserver-nfs
  namespace: static-web
  name: webserver-nfs
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webserver-nfs
  template:
    metadata:
      labels:
        app: webserver-nfs
    spec:
      volumes:
        - name: nfs-volume
          nfs:
            server: sasserver.demo.sas.com
            path: /data/static
            readOnly: no
      containers:
        - image: nginx
          name: webserver-nfs
          volumeMounts:
            - name: nfs-volume
              mountPath: /usr/share/nginx/html
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

3. Create the Service YAML (`service.yaml`):

```sh
nano service.yaml
```

Paste this:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webserver-nfs-service
  namespace: static-web
spec:
  ports:
  - port: 80
    protocol: TCP
  selector:
    app: webserver-nfs
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

4. Create the Ingress YAML (`ingress.yaml`):

```sh
nano ingress.yaml
```

Paste this:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  labels:
    app: webserver-nfs
  name: webserver-nfs
  namespace: static-web
spec:
  ingressClassName: nginx
  rules:
  - host: sasserver.demo.sas.com
    http:
      paths:
      - backend:
          service:
            name: webserver-nfs-service
            port:
              number: 80
        path: /webserver
        pathType: Prefix
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

5. Apply the Deployment, Service, and Ingress:

```sh
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### OPTION B: NodePort
1. Create the `deployment.yaml` as in the Ingress version. 

2. Create the Deployment and Service YAML (`service-nodeport.yaml`):

```sh
nano service-nodeport.yaml
```

Paste this:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: webserver-nfs-service
  namespace: static-web
spec:
  selector:
    app: webserver-nfs
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
      nodePort: 30080
  type: NodePort
```

Save and exit (`CTRL`+`X`, `Y`, `ENTER`)

3. Apply the Service:

```sh
kubectl apply -f deployment.yaml
kubectl apply -f service-nodeport.yaml
```

### Check Deployment

6. Check pod status:

```sh
kubectl get pods -n static-web
```

7. Access the web server using the configured ingress:

```sh
http://sasserver.demo.sas.com/webserver
```

8. Access the sample chart page:

```sh
http://sasserver.demo.sas.com/webserver/charts/sample-chart
```

## Useful Commands

### Get all Pods for a Namespace

```sh
kubectl get pods -n <namespace>
```

### Delete Deployment (same for service.yaml, ingress.yaml...)

```sh
kubectl delete -f deployment.yaml
```

### Delete Namespace

```sh
kubectl delete namespace <namespace>
```

### Verify Deletion

```sh
kubectl get namespaces
kubectl get all -n <namespace>
```

### Restart all Pods in Namespace

```sh
kubectl delete pod -n <namespace> --all
```

---
