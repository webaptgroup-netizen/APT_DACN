import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  List,
  Row,
  Space,
  Spin,
  Tooltip,
  Typography
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  AimOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  RotateLeftOutlined,
  RotateRightOutlined
} from '@ant-design/icons';

interface ThreeDAsset {
  name: string;
  path: string;
  url: string;
}

const ROOM_SCALE = 1; // 1 đơn vị = 1m

type FurnitureInstance = {
  id: string;
  assetPath: string;
  group: THREE.Group;
};

const InteriorDesignerPage = () => {
  const { message } = AntdApp.useApp();

  const [assets, setAssets] = useState<ThreeDAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [selectedAssetPath, setSelectedAssetPath] = useState<string | null>(null);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  // Three.js refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const floorMeshesRef = useRef<THREE.Object3D[]>([]);
  const furnitureRootRef = useRef<THREE.Group | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);

  const assetsRef = useRef<ThreeDAsset[]>([]);
  const selectedAssetPathRef = useRef<string | null>(null);
  const selectedFurnitureIdRef = useRef<string | null>(null);
  const furnitureInstancesRef = useRef<Map<string, FurnitureInstance>>(new Map());
  const furnitureTemplateCacheRef = useRef<Map<string, THREE.Group>>(new Map());

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    selectedAssetPathRef.current = selectedAssetPath;
  }, [selectedAssetPath]);

  useEffect(() => {
    selectedFurnitureIdRef.current = selectedFurnitureId;
  }, [selectedFurnitureId]);

  // Tải danh sách mô hình nội thất từ backend
  useEffect(() => {
    const loadAssets = async () => {
      setLoadingAssets(true);
      setAssetsError(null);
      try {
        const { data } = await api.get<ThreeDAsset[]>('/storage/3d-assets');
        setAssets(data);
        if (data.length) {
          setSelectedAssetPath(data[0].path);
        }
      } catch (err: unknown) {
        console.error('Failed to load 3D assets', err);
        const maybeError = err as {
          message?: unknown;
          response?: { data?: { message?: unknown } };
        };
        const messageText =
          (typeof maybeError.response?.data?.message === 'string'
            ? maybeError.response?.data?.message
            : undefined) ??
          (typeof maybeError.message === 'string' ? maybeError.message : undefined) ??
          'Không thể tải danh sách nội thất 3D.';
        setAssetsError(messageText);
        message.error(messageText);
      } finally {
        setLoadingAssets(false);
      }
    };

    void loadAssets();
  }, [message]);

  // Khởi tạo cảnh Three.js
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e5e7eb');

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(10, 8, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.target.set(6 * ROOM_SCALE, 0, 4 * ROOM_SCALE);
    controls.update();

    // Ánh sáng
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(8, 12, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xf9fafb, 0.4);
    hemiLight.position.set(0, 10, 0);
    scene.add(hemiLight);

    // Sàn từng không gian
    const floorGroup = new THREE.Group();

    const createFloor = (
      widthMeters: number,
      depthMeters: number,
      color: string,
      xCenter: number,
      zCenter: number
    ) => {
      const geometry = new THREE.PlaneGeometry(widthMeters * ROOM_SCALE, depthMeters * ROOM_SCALE);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(xCenter * ROOM_SCALE, 0, zCenter * ROOM_SCALE);
      mesh.receiveShadow = true;
      mesh.userData.isFloor = true;
      floorGroup.add(mesh);
      floorMeshesRef.current.push(mesh);
    };

    // A. Phòng khách + bếp (khoảng 7m x 3.2m)
    createFloor(7, 3.2, '#f3f4f6', 3.5, 1.6);

    // E. Logia (3m x 1.2m) nối với phòng khách
    createFloor(3, 1.2, '#dbeafe', 3.5, -0.6);

    // B. Phòng ngủ master (~3.6m x 3.1m)
    createFloor(3.6, 3.1, '#fef9c3', 8.3, 1.55);

    // C. Phòng ngủ nhỏ (~3m x 2.9m)
    createFloor(3, 2.9, '#fee2e2', 8.2, 4.5);

    // D. Khu +1 (2m x 2.5m)
    createFloor(2, 2.5, '#e0f2fe', 6.3, 3.5);

    scene.add(floorGroup);

    // Tường có "hồn" hơn: phối nhiều màu và có cửa sổ
    const makeWall = (
      lengthMeters: number,
      thicknessMeters: number,
      heightMeters: number,
      xCenter: number,
      zCenter: number,
      rotationY: number,
      color: string
    ) => {
      const geometry = new THREE.BoxGeometry(
        lengthMeters * ROOM_SCALE,
        heightMeters,
        thicknessMeters * ROOM_SCALE
      );
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        metalness: 0.05
      });
      const wall = new THREE.Mesh(geometry, material);
      wall.position.set(xCenter * ROOM_SCALE, heightMeters / 2, zCenter * ROOM_SCALE);
      wall.rotation.y = rotationY;
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
      return wall;
    };

    const wallHeight = 2.7;
    const wallThickness = 0.12;

    // Tường bao ngoài, thay đổi tông màu giữa các cạnh
    makeWall(14, wallThickness, wallHeight, 4.7, -2, 0, '#e5e7eb'); // trước
    makeWall(14, wallThickness, wallHeight, 4.7, 6.6, 0, '#e5e7eb'); // sau
    makeWall(8.8, wallThickness, wallHeight, -0.9, 2.3, Math.PI / 2, '#bfdbfe'); // trái
    makeWall(8.8, wallThickness, wallHeight, 9.8, 2.3, Math.PI / 2, '#fecaca'); // phải

    // Tường ngăn phòng master
    makeWall(3.6, wallThickness, wallHeight, 8.3, 0, 0, '#f9e2af');

    // "Cửa sổ" lớn phòng master
    const windowGeo = new THREE.PlaneGeometry(2.2 * ROOM_SCALE, 1.6);
    const windowMat = new THREE.MeshStandardMaterial({
      color: '#bfdbfe',
      transparent: true,
      opacity: 0.75,
      emissive: new THREE.Color('#93c5fd'),
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    windowMesh.position.set(8.3 * ROOM_SCALE, 1.5, -2 * ROOM_SCALE + 0.01);
    scene.add(windowMesh);

    // Grid nhẹ để dễ canh
    const grid = new THREE.GridHelper(16, 32, 0x9ca3af, 0xe5e7eb);
    (grid.material as THREE.Material).opacity = 0.3;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = 0.001;
    scene.add(grid);

    // Nhóm chứa toàn bộ nội thất
    const furnitureRoot = new THREE.Group();
    furnitureRoot.name = 'FurnitureRoot';
    scene.add(furnitureRoot);

    const raycaster = new THREE.Raycaster();
    const loader = new GLTFLoader();

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;
    controlsRef.current = controls;
    furnitureRootRef.current = furnitureRoot;
    raycasterRef.current = raycaster;
    loaderRef.current = loader;

    let animationFrameId: number;

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!canvasContainerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = canvasContainerRef.current.clientWidth || width;
      const newHeight = canvasContainerRef.current.clientHeight || height;
      rendererRef.current.setSize(newWidth, newHeight);
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);

    const handleClick = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current || !raycasterRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const mouse = new THREE.Vector2(x, y);
      raycasterRef.current.setFromCamera(mouse, cameraRef.current);

      // 1. Thử chọn vật đang có trước
      const furnitureRootNode = furnitureRootRef.current;
      if (furnitureRootNode) {
        const clickable: THREE.Object3D[] = [];
        furnitureRootNode.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            clickable.push(mesh);
          }
        });

        const hits = raycasterRef.current.intersectObjects(clickable, true);
        if (hits.length > 0) {
          let obj = hits[0].object;
          while (obj && !obj.userData.furnitureId && obj.parent) {
            obj = obj.parent;
          }
          const id = obj.userData.furnitureId as string | undefined;
          if (id) {
            setSelectedFurnitureId(id);
            return;
          }
        }
      }

      // 2. Nếu không chọn trúng vật → đặt vật mới lên sàn
      const floors = floorMeshesRef.current;
      if (!floors.length) {
        setSelectedFurnitureId(null);
        return;
      }

      const floorHits = raycasterRef.current.intersectObjects(floors, false);
      if (!floorHits.length) {
        setSelectedFurnitureId(null);
        return;
      }

      const hit = floorHits[0];
      const point = hit.point;

      const currentAssetPath = selectedAssetPathRef.current;
      if (!currentAssetPath) return;

      const asset = assetsRef.current.find((a) => a.path === currentAssetPath);
      if (!asset) return;

      const addInstanceToScene = (template: THREE.Group) => {
        const instance = template.clone(true);

        // Chuẩn hoá để đáy mô hình nằm đúng trên sàn
        const box = new THREE.Box3().setFromObject(instance);
        if (isFinite(box.min.y)) {
          const offsetY = -box.min.y;
          instance.position.y += offsetY;
        }

        instance.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
        });

        const container = new THREE.Group();
        const id = `${asset.path}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        container.name = `Furniture-${id}`;
        container.userData.furnitureId = id;
        container.add(instance);

        container.position.set(point.x, 0, point.z);

        furnitureRootRef.current?.add(container);
        furnitureInstancesRef.current.set(id, {
          id,
          assetPath: asset.path,
          group: container
        });

        setSelectedFurnitureId(id);
      };

      const cachedTemplate = furnitureTemplateCacheRef.current.get(asset.path);
      if (cachedTemplate) {
        addInstanceToScene(cachedTemplate);
        return;
      }

      const loader = loaderRef.current;
      if (!loader) return;

      loader.load(
        asset.url,
        (gltf: GLTF) => {
          const root = gltf.scene;
          furnitureTemplateCacheRef.current.set(asset.path, root);
          addInstanceToScene(root);
        },
        undefined,
        (err: unknown) => {
          console.error('Failed to load GLB model', err);
          message.error('Không tải được mô hình nội thất. Vui lòng thử lại.');
        }
      );
    };

    renderer.domElement.addEventListener('click', handleClick);

    setSceneReady(true);

    return () => {
      setSceneReady(false);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);

      furnitureInstancesRef.current.clear();
      furnitureTemplateCacheRef.current.clear();
      floorMeshesRef.current = [];

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (sceneRef.current) {
        sceneRef.current.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => m.dispose());
            } else {
              obj.material.dispose();
            }
          }
        });
      }

      if (container && renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [message]);

  const canUseControls = sceneReady && !!selectedFurnitureId;

  const selectedAsset = useMemo(
    () => assets.find((a) => a.path === selectedAssetPath) ?? null,
    [assets, selectedAssetPath]
  );

  const nudgeSelectedFurniture = (dx: number, dz: number) => {
    const id = selectedFurnitureIdRef.current;
    if (!id) return;
    const instance = furnitureInstancesRef.current.get(id);
    if (!instance) return;
    instance.group.position.x += dx;
    instance.group.position.z += dz;
    instance.group.position.y = 0;
  };

  const rotateSelectedFurniture = (deltaRadians: number) => {
    const id = selectedFurnitureIdRef.current;
    if (!id) return;
    const instance = furnitureInstancesRef.current.get(id);
    if (!instance) return;
    instance.group.rotation.y += deltaRadians;
  };

  const clearSelection = () => {
    setSelectedFurnitureId(null);
  };

  const hasAssets = assets.length > 0;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div className="page-header">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Thiết kế nội thất 3D căn hộ
          </Typography.Title>
          <Typography.Text type="secondary">
            Không gian mở gồm phòng khách + bếp, phòng ngủ master, phòng ngủ nhỏ, khu +1 và logia
            được mô phỏng gần với kích thước thực tế để bạn bố trí nội thất dễ hình dung nhất.
          </Typography.Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            bordered={false}
            style={{ borderRadius: 20, height: 600 }}
            bodyStyle={{ height: '100%', padding: 0 }}
          >
            <div
              ref={canvasContainerRef}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 20,
                overflow: 'hidden',
                background:
                  'radial-gradient(circle at top, #dbeafe 0, #e5e7eb 45%, #cbd5e1 100%)',
                boxShadow: '0 12px 40px rgba(15, 23, 42, 0.3)'
              }}
            >
              {!sceneReady && (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Spin tip="Đang khởi tạo phòng 3D..." />
                </div>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card
              bordered={false}
              style={{ borderRadius: 20 }}
              title="Thả nội thất từ Supabase"
            >
              {loadingAssets && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <Spin tip="Đang tải danh sách nội thất..." />
                </div>
              )}

              {!loadingAssets && assetsError && (
                <Typography.Text type="danger">{assetsError}</Typography.Text>
              )}

              {!loadingAssets && !assetsError && !hasAssets && (
                <Empty description="Chưa có nội thất 3D nào trong bucket 3D" />
              )}

              {!loadingAssets && !assetsError && hasAssets && (
                <>
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                    Chọn một mô hình nội thất, sau đó dùng chuột bấm vào khu vực sàn căn hộ để đặt
                    vật đó vào phòng.
                  </Typography.Paragraph>
                  <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 8 }}>
                    <List
                      size="small"
                      dataSource={assets}
                      renderItem={(asset) => {
                        const isActive = selectedAssetPath === asset.path;
                        const displayName = asset.name.replace(/\.glb$/i, '');
                        return (
                          <List.Item style={{ padding: '4px 0' }}>
                            <Button
                              block
                              type={isActive ? 'primary' : 'default'}
                              onClick={() => setSelectedAssetPath(asset.path)}
                            >
                              {displayName}
                            </Button>
                          </List.Item>
                        );
                      }}
                    />
                  </div>
                  <Typography.Text type="secondary">
                    Mục đồ trên được lấy từ bucket <Typography.Text code>apt-assets/3D</Typography.Text>{' '}
                    của Supabase.
                  </Typography.Text>
                </>
              )}
            </Card>

            <Card
              bordered={false}
              style={{ borderRadius: 20 }}
              title="Điều khiển vật đã đặt"
              extra={
                <Space size="small">
                  <AimOutlined style={{ color: canUseControls ? '#22c55e' : '#9ca3af' }} />
                  <Typography.Text type={canUseControls ? 'success' : 'secondary'}>
                    {selectedFurnitureId ? 'Đang chọn một vật' : 'Chưa chọn vật nào'}
                  </Typography.Text>
                </Space>
              }
            >
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                  Bấm vào một vật trong phòng để chọn, sau đó dùng các nút bên dưới để di chuyển
                  trái/phải/trước/sau và xoay vật. Vật luôn bám sát sàn, không bị chìm hoặc hở khỏi sàn.
                </Typography.Paragraph>

                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Space align="center" style={{ width: '100%', justifyContent: 'center' }}>
                    <Tooltip title="Di chuyển lên trước">
                      <Button
                        shape="circle"
                        icon={<ArrowUpOutlined />}
                        disabled={!canUseControls}
                        onClick={() => nudgeSelectedFurniture(0, -0.3)}
                      />
                    </Tooltip>
                  </Space>
                  <Space align="center" style={{ width: '100%', justifyContent: 'center' }}>
                    <Tooltip title="Di chuyển sang trái">
                      <Button
                        shape="circle"
                        icon={<ArrowLeftOutlined />}
                        disabled={!canUseControls}
                        onClick={() => nudgeSelectedFurniture(-0.3, 0)}
                      />
                    </Tooltip>
                    <Tooltip title="Di chuyển sang phải">
                      <Button
                        shape="circle"
                        icon={<ArrowRightOutlined />}
                        disabled={!canUseControls}
                        onClick={() => nudgeSelectedFurniture(0.3, 0)}
                      />
                    </Tooltip>
                  </Space>
                  <Space align="center" style={{ width: '100%', justifyContent: 'center' }}>
                    <Tooltip title="Di chuyển lùi lại">
                      <Button
                        shape="circle"
                        icon={<ArrowDownOutlined />}
                        disabled={!canUseControls}
                        onClick={() => nudgeSelectedFurniture(0, 0.3)}
                      />
                    </Tooltip>
                  </Space>
                </Space>

                <Space align="center" style={{ width: '100%', justifyContent: 'center' }} size="large">
                  <Tooltip title="Xoay trái">
                    <Button
                      shape="circle"
                      icon={<RotateLeftOutlined />}
                      disabled={!canUseControls}
                      onClick={() => rotateSelectedFurniture(Math.PI / 12)}
                    />
                  </Tooltip>
                  <Tooltip title="Xoay phải">
                    <Button
                      shape="circle"
                      icon={<RotateRightOutlined />}
                      disabled={!canUseControls}
                      onClick={() => rotateSelectedFurniture(-Math.PI / 12)}
                    />
                  </Tooltip>
                </Space>

                <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
                  <Button onClick={clearSelection} disabled={!selectedFurnitureId}>
                    Bỏ chọn vật
                  </Button>
                  {selectedAsset && (
                    <Typography.Text type="secondary">
                      Đang chọn mô hình:{' '}
                      <Typography.Text strong>
                        {selectedAsset.name.replace(/\.glb$/i, '')}
                      </Typography.Text>
                    </Typography.Text>
                  )}
                </Space>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </Space>
  );
};

export default InteriorDesignerPage;
