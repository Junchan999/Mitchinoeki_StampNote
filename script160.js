document.addEventListener('DOMContentLoaded', () => {
    // --- 既存のHTML要素への参照 ---
    const csvFileInput = document.getElementById('csvFileInput');
    const saveCsvButton = document.getElementById('saveCsvButton');
    const stationDropdown = document.getElementById('stationDropdown');
    const stationDetailsDisplay = document.getElementById('stationDetailsDisplay');
    const actionButtonsForDetails = document.querySelector('.action-buttons-for-details');
    // const mapElement = document.getElementById('map'); // 直接使用しないが、参照として保持しても良い
    const achievementRateSpan = document.getElementById('achievementRate');

    // --- 新しいタブ関連のHTML要素への参照 ---
    const stationInfoTabButton = document.getElementById('stationInfoTabButton');
    const routeCreationTabButton = document.getElementById('routeCreationTabButton');
    // const stationInfoTabContent = document.getElementById('stationInfoTabContent'); // 直接使用しないが、参照として保持しても良い
    // const routeCreationTabContent = document.getElementById('routeCreationTabContent'); // 直接使用しないが、参照として保持しても良い

    // ルーティング関連のHTML要素への参照 (routeCreationTabContent内)
    const routeCsvFileInput = document.getElementById('routeCsvFileInput'); 
    const loadRouteCsvButton = document.getElementById('loadRouteCsvButton'); 
    const clearRouteButton = document.getElementById('clearRouteButton');
    const showRouteListButton = document.getElementById('showRouteListButton');
    const printRouteListButton = document.getElementById('printRouteListButton'); 
    const saveRouteCsvButton = document.getElementById('saveRouteCsvButton'); 
    const showManualButton = document.getElementById('showManualButton'); // タブコンテンツ外に配置
    
    // ルート地点設定ボタン
    const setStartModeButton = document.getElementById('setStartModeButton');
    const setEndModeButton = document.getElementById('setEndModeButton');
    const setWaypointModeButton = document.getElementById('setWaypointModeButton'); 

    // ルート地点解除ボタン (追加)
    const clearStartPointButton = document.getElementById('clearStartPointButton');
    const clearEndPointButton = document.getElementById('clearEndPointButton');
    const clearIntermediateWaypointsButton = document.getElementById('clearIntermediateWaypointsButton'); // 全解除ボタン

    const addSelectedStationAsWaypointButton = document.getElementById('addSelectedStationAsWaypointButton'); // 新しいボタン
    const intermediateWaypointsList = document.getElementById('intermediateWaypointsList'); // 追加: 中継地点/経由地のリスト
    const averageSpeedInput = document.getElementById('averageSpeedInput');
    const defaultStayTimeInput = document.getElementById('defaultStayTimeInput');

    // 新しく追加する道の駅マーカー表示/非表示ボタン
    const toggleStationMarkersButton = document.getElementById('toggleStationMarkersButton'); //

    // --- Leafletマップの初期化 ---
    const map = L.map('map').setView([36.2048, 138.2529], 6);

    // OpenStreetMapタイルレイヤーを追加
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const DEFAULT_VISIT_DATE = '2025-09-01'; // 訪問日未入力時のデフォルト値

    // --- カスタムアイコンの定義 ---
    // カスタムアイコン：訪問済み道の駅用（赤色の丸）
    const redCircleIcon = L.divIcon({
        className: 'custom-red-circle-marker',
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
        html: '<div style="background-color: #e31a1c; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #a80000;"></div>'
    });

    // カスタムアイコン：出発地点用（緑色）
    const startIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // カスタムアイコン：終了地点用（赤色）
    const endIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // カスタムアイコン：中継地点用（青色）- 滞在時間あり
    const intermediateIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // カスタムアイコン：経由地用（紫色）- 滞在時間なし (新規追加)
    const viaPointIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png', // 紫色のマーカー
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });


    // --- グローバル変数 ---
    let allStationsData = []; // CSVから読み込んだ道の駅の全データ
    let stationMarkers = [];  // 地図上の道の駅マーカー (Leaflet.Markerオブジェクトの配列)
    let currentSelectedStationIndex = null; // 現在選択中の道の駅のインデックス
    let editingStationIndex = null;         // 編集中の道の駅のインデックス (nullの場合は編集中ではない)
    let stationMarkersVisible = true; // 道の駅マーカーの表示状態を管理するフラグ

    // ルーティング関連のデータ
    // latLng, name, marker?, hasStayTime (中継地点のみtrue)
    let startPoint = null;          // 出発地点 { latLng: L.LatLng, name: string, marker?: L.Marker }
    let endPoint = null;            // 終了地点   { latLng: L.LatLng, name: string, marker?: L.Marker }
    let intermediateWaypoints = []; // 中継地点/経由地の配列 [{ latLng: L.LatLng, name: string, marker?: L.Marker, hasStayTime: boolean }, ...]

    let routePointMarkers = [];     // 出発/終了/中継/経由地のカスタムマーカー (Leaflet.Markerオブジェクトの配列)

    let routingControl = null;      // Leaflet Routing Machine のインスタンス
    let routeListWindow = null;     // 開いているルート一覧ウィンドウへの参照
    let manualWindow = null;        // 開いている取扱説明書ウィンドウへの参照 

    let routeTotalDistance = 0;             // OSRMから取得する総距離 (メートル)
    let routeCalculatedTravelTimeMinutes = 0; // ユーザー設定の時速で計算した走行時間 (分)
    let routeTotalStayTimeMinutes = 0;      // ユーザー設定の滞在時間で計算した総滞在時間 (分)
    let routeTotalElapsedTimeMinutes = 0;   // 総走行時間 + 総滞在時間 (分)

    // マップクリックモード: 'none', 'setStart', 'setEnd', 'setWaypoint' (経由地/中継地点を追加するモード)
    let currentMapClickMode = 'none'; 
    let averageSpeedKmH = parseFloat(averageSpeedInput.value); // ユーザー設定の平均走行時速 (km/h)
    let defaultStayTimeMinutes = parseFloat(defaultStayTimeInput.value); // ユーザー設定の道の駅ごとの滞在時間 (分)


    // --- タブ切り替えロジック ---
    function showTab(tabId) {
        // すべてのタブコンテンツを非表示にする
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        // すべてのタブボタンのアクティブ状態を解除する
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        // 選択されたタブコンテンツを表示し、対応するタブボタンをアクティブにする
        document.getElementById(tabId).classList.add('active');
        document.getElementById(tabId === 'stationInfoTabContent' ? 'stationInfoTabButton' : 'routeCreationTabButton').classList.add('active');
    }

    // タブボタンのイベントリスナー
    stationInfoTabButton.addEventListener('click', () => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        showTab('stationInfoTabContent');
    });

    routeCreationTabButton.addEventListener('click', () => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        showTab('routeCreationTabContent');
        currentMapClickMode = 'none'; // ルートタブに切り替えたら、マップクリックモードをリセット
        updateMapModeButtonsUI();
    });
    // --- タブ切り替えロジック終了 ---


    // Leaflet Routing Machine の初期化 (ルートラインの色と太さを調整)
    function initRoutingControl() {
        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null; // 既存のコントロールを完全にクリア
        }
        routingControl = L.Routing.control({
            waypoints: [], // 初期はウェイポイントなし
            routeWhileDragging: false, // ドラッグ中にルートを再計算しない
            show: false, // デフォルトのルート指示パネルを非表示にする
            draggableWaypoints: false, // 地図上でウェイポイントをドラッグできないようにする
            addWaypoints: false, // クリックでウェイポイントを追加できないようにする
            altLineOptions: { // 代替ルートのスタイル（必要に応じて）
                styles: [
                    {color: 'black', opacity: 0.15, weight: 10}, // シャドウ
                    {color: 'white', opacity: 0.8, weight: 7}, // 白抜き
                    {color: '#0000FF', opacity: 0.7, weight: 7} // メインのルートラインを青色、太めに (Weightを7に)
                ]
            },
            router: L.Routing.osrmv1({ // OSRM サービスをルーターとして使用
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            })
        }).addTo(map); // マップにルーティングコントロールを追加

        // ルートが見つかったときのイベントリスナー
        routingControl.on('routesfound', function(e) {
            const routes = e.routes;
            if (routes.length > 0) {
                const route = routes[0]; // 最初のルートを使用
                routeTotalDistance = route.summary.totalDistance; // 総距離 (メートル)
            } else {
                routeTotalDistance = 0;
                console.warn('ルートが見つかりませんでした。');
            }
            calculateRouteTimes(); // 距離に基づいて時間を計算
            updateRouteListWindow(); // 別ウィンドウのリストを更新
        });

        // ルーティングエラーが発生したときのイベントリスナー
        routingControl.on('routingerror', function(e) {
            console.error('ルーティングエラー:', e.error);
            // エラー時でも距離はクリアし、時間を再計算、ウィンドウを更新
            routeTotalDistance = 0;
            calculateRouteTimes();
            updateRouteListWindow();
        });
    }

    // 初回ロード時にルーティングコントロールをセットアップ
    initRoutingControl();

    // 地図全体に対するクリックイベントリスナー
    map.on('click', (e) => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        
        // マップクリックモードが有効な場合のみ、ルート作成タブを表示
        if (currentMapClickMode !== 'none') {
            showTab('routeCreationTabContent');
        }

        if (currentMapClickMode === 'setStart') {
            setStartPoint(e.latlng, `地図上の出発地点 (Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)})`);
            currentMapClickMode = 'none'; // 設定後モードを解除
            updateMapModeButtonsUI(); // ボタンUIを更新
        } else if (currentMapClickMode === 'setEnd') {
            setEndPoint(e.latlng, `地図上の終了地点 (Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)})`);
            currentMapClickMode = 'none'; // 設定後モードを解除
            updateMapModeButtonsUI(); // ボタンUIを更新
        } else if (currentMapClickMode === 'setWaypoint') { // 経由地として地図をクリックして選択するモード
            handleMapClickForIntermediate(e.latlng, `地図上の経由地 (Lat: ${e.latlng.lat.toFixed(4)}, Lng: ${e.latlng.lng.toFixed(4)})`, false); // 経由地はhasStayTime: false
        }
    });

    // 道の駅マーカー表示/非表示ボタンのイベントリスナー
    toggleStationMarkersButton.addEventListener('click', () => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        toggleStationMarkers(!stationMarkersVisible);
    });


    // --- ルーティング関連ボタンのイベントリスナー (routeCreationTabContent内) ---
    loadRouteCsvButton.addEventListener('click', loadRouteCsvFile); 
    routeCsvFileInput.addEventListener('change', () => { 
        loadRouteCsvButton.disabled = routeCsvFileInput.files.length === 0 || editingStationIndex !== null;
    });

    clearRouteButton.addEventListener('click', clearRoute);
    showRouteListButton.addEventListener('click', openRouteListWindow);
    printRouteListButton.addEventListener('click', printRouteList); 
    saveRouteCsvButton.addEventListener('click', () => { 
        if (startPoint === null || endPoint === null) {
            alert('出発地点と終了地点が設定されている場合にのみルートを保存できます。');
            return;
        }
        saveRouteCSVFile(generateRouteCSV());
    });
    showManualButton.addEventListener('click', showManual); // タブコンテンツ外に配置

    // マップモード設定ボタンのイベントリスナー (routeCreationTabContent内)
    setStartModeButton.addEventListener('click', () => {
        if (allStationsData.length === 0 && !startPoint && intermediateWaypoints.length === 0 && !endPoint) { 
            alert('道の駅を地図上に表示したい場合は、まずCSVファイルを読み込んでください。任意地点の設定は可能です。');
        }
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        currentMapClickMode = (currentMapClickMode === 'setStart') ? 'none' : 'setStart';
        updateMapModeButtonsUI();
        if (currentMapClickMode === 'setStart') {
            alert('地図をクリックして出発地点を設定してください。道の駅のマーカーをクリックすることもできます。');
        }
    });
    setEndModeButton.addEventListener('click', () => {
        if (allStationsData.length === 0 && !startPoint && intermediateWaypoints.length === 0 && !endPoint) { 
            alert('道の駅を地図上に表示したい場合は、まずCSVファイルを読み込んでください。任意地点の設定は可能です。');
        }
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        currentMapClickMode = (currentMapClickMode === 'setEnd') ? 'none' : 'setEnd';
        updateMapModeButtonsUI();
        if (currentMapClickMode === 'setEnd') {
            alert('地図をクリックして終了地点を設定してください。道の駅のマーカーをクリックすることもできます。');
        }
    });

    // 新しい「経由地として地図で選択」ボタンのイベントリスナー
    setWaypointModeButton.addEventListener('click', () => {
        if (allStationsData.length === 0 && !startPoint && intermediateWaypoints.length === 0 && !endPoint) {
            alert('道の駅を地図上に表示したい場合は、まずCSVファイルを読み込んでください。任意地点の設定は可能です。');
        }
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        currentMapClickMode = (currentMapClickMode === 'setWaypoint') ? 'none' : 'setWaypoint';
        updateMapModeButtonsUI();
        if (currentMapClickMode === 'setWaypoint') {
            alert('地図をクリックして経由地を追加してください。');
        }
    });

    // 各地点解除ボタンのイベントリスナー (追加)
    clearStartPointButton.addEventListener('click', () => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        clearStartPoint();
        updateMapRoute(); // ルート再計算
        updateRoutePointMarkers(); // マーカー再描画
        updateRouteButtonsState(); // ボタン状態更新
        updateIntermediateWaypointsListUI(); // リストUI更新
    });

    clearEndPointButton.addEventListener('click', () => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        clearEndPoint();
        updateMapRoute();
        updateRoutePointMarkers();
        updateRouteButtonsState();
        updateIntermediateWaypointsListUI();
    });

    clearIntermediateWaypointsButton.addEventListener('click', () => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        clearIntermediateWaypoints(); // 全ての中継/経由地をクリア
        updateMapRoute();
        updateRoutePointMarkers();
        updateRouteButtonsState();
        updateIntermediateWaypointsListUI();
    });


    // 選択中の道の駅を中継地点として追加ボタンのイベントリスナー (routeCreationTabContent内)
    addSelectedStationAsWaypointButton.addEventListener('click', () => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
            return;
        }
        if (currentSelectedStationIndex !== null && allStationsData[currentSelectedStationIndex]) {
            const station = allStationsData[currentSelectedStationIndex];
            const stationLatLng = L.latLng(station.latitude, station.longitude);

            // この道の駅が既に出発/終了/中継地点/経由地に設定されていないかチェック
            const isAlreadyRoutePoint = (startPoint && startPoint.latLng.equals(stationLatLng)) ||
                                        (endPoint && endPoint.latLng.equals(stationLatLng)) ||
                                        (intermediateWaypoints.some(wp => wp.latLng.equals(stationLatLng)));
            
            if (isAlreadyRoutePoint) {
                alert('この道の駅は既に出発地点、終了地点、または中継地点/経由地として設定されています。');
                return;
            }

            addIntermediateWaypoint(stationLatLng, station.name, true); // 道の駅からの追加は中継地点(hasStayTime: true)
            // 中継地点追加後、ルート作成タブがアクティブのままになるようにします。
            showTab('routeCreationTabContent');
            updateRouteButtonsState(); // ボタンの状態を更新
        } else {
            alert('まず道の駅情報タブで追加したい道の駅を選択してください。');
            showTab('stationInfoTabContent'); // 道の駅情報タブに誘導
        }
    });

    // 走行時速と滞在時間の入力フィールドのイベントリスナー (routeCreationTabContent内)
    averageSpeedInput.addEventListener('change', (event) => {
        const newSpeed = parseFloat(event.target.value);
        if (!isNaN(newSpeed) && newSpeed > 0) {
            averageSpeedKmH = newSpeed;
            if (startPoint !== null && endPoint !== null) { 
                calculateRouteTimes();
                updateRouteListWindow();
            }
        } else {
            alert('有効な走行時速を入力してください (0より大きい数値)。');
            event.target.value = averageSpeedKmH; 
        }
    });

    defaultStayTimeInput.addEventListener('change', (event) => {
        const newStayTime = parseFloat(event.target.value);
        if (!isNaN(newStayTime) && newStayTime >= 0) {
            defaultStayTimeMinutes = newStayTime;
            if (startPoint !== null && endPoint !== null) { 
                calculateRouteTimes();
                updateRouteListWindow();
            }
        } else {
            alert('有効な滞在時間を入力してください (0以上の数値)。');
            event.target.value = defaultStayTimeMinutes; 
        }
    });

    // --- 道の駅CSVファイルの読み込みと保存 (stationInfoTabContent内) ---
    csvFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
                const csvText = e.target.result;
                try {
                    if (editingStationIndex !== null) {
                        alert('編集中のデータがあります。一度保存またはキャンセルしてください。');
                        return;
                    }

                    allStationsData = parseCSV(csvText);
                    populateStationDropdown(allStationsData);
                    addMarkersToMap(allStationsData); // マーカーの追加 (表示はtoggleStationMarkersが制御)
                    stationMarkersVisible = true; // 新しいCSVを読み込んだらデフォルトで表示状態に
                    
                    if (allStationsData.length > 0) {
                        stationDropdown.value = '0'; // 最初の道の駅を選択状態にする
                        showStationDetails(0); // 最初の道の駅の詳細を表示
                        stationDropdown.disabled = false;
                    } else {
                        stationDetailsDisplay.innerHTML = '<p>表示する道の駅データがありません。</p>';
                        stationDropdown.disabled = true;
                    }

                    saveCsvButton.disabled = false;
                    updateAchievementRate();
                    updateRouteButtonsState(); 
                    updateMapModeButtonsUI(); 
                    updateToggleStationMarkersButtonUI(); // ボタンのテキストと状態を更新
                } catch (error) {
                    console.error('Error processing CSV file:', error);
                    stationDetailsDisplay.innerHTML = `<p style="color: red;">CSVファイルの解析に失敗しました: ${error.message}</p>`;
                    clearMapMarkers(); // マップから全てのマーカーを削除し、配列もクリア
                    allStationsData = [];
                    stationDropdown.innerHTML = '<option value="">--- CSVファイルを読み込んでください ---</option>';
                    stationDropdown.disabled = true;
                    saveCsvButton.disabled = true;
                    updateAchievementRate();
                    updateRouteButtonsState(); 
                    updateMapModeButtonsUI();
                    updateToggleStationMarkersButtonUI(); // ボタンを無効化
                }
            };

            reader.onerror = () => {
                console.error('Error reading file:', reader.error);
                stationDetailsDisplay.innerHTML = `<p style="color: red;">ファイルの読み込みに失敗しました。</p>`;
                clearMapMarkers(); // マップから全てのマーカーを削除し、配列もクリア
                allStationsData = [];
                stationDropdown.innerHTML = '<option value="">--- CSVファイルを読み込んでください ---</option>';
                stationDropdown.disabled = true;
                saveCsvButton.disabled = true;
                updateAchievementRate();
                updateRouteButtonsState(); 
                updateMapModeButtonsUI();
                updateToggleStationMarkersButtonUI(); // ボタンを無効化
            };

            reader.readAsText(file, 'UTF-8');
        } else {
            // ファイルが選択されなかった場合のUIリセット
            stationDetailsDisplay.innerHTML = '<p>CSVファイルを読み込んでください。</p>';
            clearMapMarkers(); // マップから全てのマーカーを削除し、配列もクリア
            allStationsData = [];
            stationDropdown.innerHTML = '<option value="">--- CSVファイルを読み込んでください ---</option>';
            stationDropdown.disabled = true;
            saveCsvButton.disabled = true;
            updateAchievementRate();
            updateRouteButtonsState(); 
            updateMapModeButtonsUI();
            updateToggleStationMarkersButtonUI(); // ボタンを無効化
        }
    });

    stationDropdown.addEventListener('change', (event) => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。一度保存またはキャンセルしてください。');
            stationDropdown.value = currentSelectedStationIndex;
            return;
        }
        const selectedIndex = parseInt(event.target.value);
        if (!isNaN(selectedIndex) && allStationsData[selectedIndex]) {
            showTab('stationInfoTabContent'); // 道の駅が選択されたら道の駅情報タブに切り替える
            showStationDetails(selectedIndex);
        } else {
            // オプションが選択解除された場合、もしマーカーが非表示モードなら、表示されていた単一マーカーも削除
            if (!stationMarkersVisible) { //
                toggleStationMarkers(false); // 全ての道の駅マーカーを非表示にする（特定の1つを表示していた場合も含む）
            } else {
                if (currentSelectedStationIndex !== null && stationMarkers[currentSelectedStationIndex]) {
                    stationMarkers[currentSelectedStationIndex].closePopup();
                }
            }
            currentSelectedStationIndex = null;
            map.setView([36.2048, 138.2529], 6); // 日本全体にビューをリセット
            stationDetailsDisplay.innerHTML = '<p>道の駅を選択してください。</p>'; //
            updateRouteButtonsState(); // 選択解除された場合もボタンの状態を更新
        }
    });

    saveCsvButton.addEventListener('click', () => {
        if (editingStationIndex !== null) {
            alert('編集中のデータがあります。一度保存またはキャンセルしてから保存してください。');
            return;
        }
        if (allStationsData.length > 0) {
            saveCSVFile(allStationsData);
        } else {
            alert('保存するデータがありません。');
        }
    });

    /**
     * CSVテキストを解析し、道の駅オブジェクトの配列を生成する
     * @param {string} csvText - CSVファイルの内容
     * @returns {Array<Object>} 道の駅オブジェクトの配列
     * @throws {Error} CSVフォーマットが不正な場合
     */
    function parseCSV(csvText) {
        const rows = csvText.trim().split('\n');
        if (rows.length <= 1) {
            throw new Error('CSVファイルにデータがありません。');
        }

        const stations = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (row) {
                const columns = [];
                let inQuote = false;
                let currentField = '';
                for (let j = 0; j < row.length; j++) {
                    const char = row[j];
                    if (char === '"') {
                        // 二重引用符で囲まれたフィールド内の二重引用符のエスケープを処理 ("" -> ")
                        if (inQuote && j + 1 < row.length && row[j + 1] === '"') {
                             currentField += '"';
                             j++; // 次の文字も消費
                        } else {
                            inQuote = !inQuote;
                        }
                    } else if (char === ',' && !inQuote) {
                        columns.push(currentField);
                        currentField = '';
                    } else {
                        currentField += char;
                    }
                }
                columns.push(currentField); // 最後のフィールドを追加

                // 列数を8に変更 (URLとメモが追加)
                if (columns.length !== 8) {
                    console.warn(`Malformed row skipped (expected 8 columns): ${row}`);
                    continue;
                }

                const latitude = parseFloat(columns[4]);
                const longitude = parseFloat(columns[5]);

                if (isNaN(latitude) || isNaN(longitude)) {
                    console.warn(`Invalid coordinates for row (latitude: ${columns[4]}, longitude: ${columns[5]}): ${row}`);
                    continue;
                }

                stations.push({
                    visitDate: columns[0].trim(),
                    name: columns[1].trim(),
                    phone: columns[2].trim(),
                    address: columns[3].trim(),
                    latitude: latitude,
                    longitude: longitude,
                    url: columns[6].trim(),
                    memo: columns[7].trim() // 追加: メモ欄
                });
            }
        }
        if (stations.length === 0) {
            throw new Error('有効な道の駅データが見つかりませんでした。');
        }
        return stations;
    }

    /**
     * 道の駅データをプルダウンメニューに表示する
     * @param {Array<Object>} stations - 道の駅オブジェクトの配列
     */
    function populateStationDropdown(stations) {
        stationDropdown.innerHTML = '';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '--- 道の駅を選択してください ---';
        stationDropdown.appendChild(defaultOption);

        stations.forEach((station, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = station.name;
            if (station.visitDate && station.visitDate !== '') {
                option.classList.add('visited-option');
            }
            stationDropdown.appendChild(option);
        });
    }

    /**
     * 選択された道の駅の詳細情報を縦並びに表示する
     * @param {number} index - 表示する道の駅の配列インデックス
     */
    function showStationDetails(index) {
        currentSelectedStationIndex = index;
        const station = allStationsData[index];

        if (!station) {
            stationDetailsDisplay.innerHTML = '<p>道の駅データが見つかりません。</p>';
            actionButtonsForDetails.innerHTML = '';
            return;
        }

        let detailsHtml = `
            <p><strong>訪問日:</strong> <span class="${station.visitDate === '' ? 'default-date-value' : 'visited-date-value'}">${station.visitDate === '' ? DEFAULT_VISIT_DATE : station.visitDate}</span></p>
            <p><strong>名称:</strong> ${station.name}</p>
            <p><strong>電話:</strong> ${station.phone}</p>
            <p><strong>住所:</strong> ${station.address}</p>
            <p><strong>緯度:</strong> ${station.latitude.toFixed(4)}</p>
            <p><strong>経度:</strong> ${station.longitude.toFixed(4)}</p>
        `;
        if (station.url && station.url !== '') {
            const displayUrl = station.url.startsWith('http') ? station.url : `http://${station.url}`;
            detailsHtml += `<p><strong>URL:</strong> <a href="${displayUrl}" target="_blank" rel="noopener noreferrer">${station.url}</a></p>`;
        } else {
            detailsHtml += `<p><strong>URL:</strong> (なし)</p>`;
        }
        // 追加: メモ欄の表示
        detailsHtml += `<p><strong>メモ:</strong> ${station.memo && station.memo !== '' ? station.memo.replace(/\n/g, '<br>') : '(なし)'}</p>`;


        stationDetailsDisplay.innerHTML = detailsHtml;
        stationDetailsDisplay.classList.remove('editing-display');

        actionButtonsForDetails.innerHTML = ''; 

        const editButton = document.createElement('button');
        editButton.textContent = '編集';
        editButton.classList.add('edit-btn');
        editButton.addEventListener('click', () => {
            enterEditMode(index);
        });
        actionButtonsForDetails.appendChild(editButton);
        
        // 道の駅情報タブからはルート関連のボタンは削除されました。
        // 代わりに「ルート作成」タブの `addSelectedStationAsWaypointButton` を使用します。
        
        if (!isNaN(station.latitude) && !isNaN(station.longitude)) {
            map.setView([station.latitude, station.longitude], 13);
            stationMarkers.forEach(marker => marker.closePopup());

            // マーカーが非表示モードの場合、選択された道の駅マーカーのみを表示する
            if (!stationMarkersVisible) {
                toggleStationMarkers(false, index); // 全ての道の駅マーカーを非表示にし、指定されたindexのマーカーのみ表示する
            }

            if (stationMarkers[index]) {
                stationMarkers[index].openPopup();
            }
        }

        updateRouteButtonsState(); // 道の駅選択状態が変更されたので、ルートボタンの状態を更新
    }

    /**
     * 道の駅マーカーの表示/非表示を切り替える
     * @param {boolean} show - trueなら表示、falseなら非表示
     * @param {number|null} showOnlyIndex - 特定のマーカーのみ表示する場合のインデックス (通常はnull)。非表示モード時に有効。
     */
    function toggleStationMarkers(show, showOnlyIndex = null) {
        if (!allStationsData || allStationsData.length === 0) {
            stationMarkersVisible = show; // 状態だけは更新
            updateToggleStationMarkersButtonUI();
            return;
        }

        stationMarkers.forEach((marker, index) => {
            if (show) { // 表示モードの場合
                if (!map.hasLayer(marker)) {
                    marker.addTo(map);
                }
            } else { // 非表示モードの場合
                if (showOnlyIndex !== null && index === showOnlyIndex) { // 特定のマーカーのみ表示する場合
                    if (!map.hasLayer(marker)) {
                        marker.addTo(map);
                    }
                } else { // その他のマーカーは非表示
                    if (map.hasLayer(marker)) {
                        map.removeLayer(marker);
                    }
                }
            }
        });
        stationMarkersVisible = show; // グローバル状態を更新
        updateToggleStationMarkersButtonUI(); // ボタンのテキストと状態を更新
    }

    /**
     * 道の駅マーカー表示/非表示ボタンのUIを更新する
     */
    function updateToggleStationMarkersButtonUI() {
        if (allStationsData.length === 0) {
            toggleStationMarkersButton.disabled = true;
            toggleStationMarkersButton.textContent = '道の駅マーカーを非表示';
            return;
        }
        toggleStationMarkersButton.disabled = false;
        if (stationMarkersVisible) {
            toggleStationMarkersButton.textContent = '道の駅マーカーを非表示';
        } else {
            toggleStationMarkersButton.textContent = '道の駅マーカーを表示';
        }
    }


    /**
     * 地図上のすべての道の駅マーカーをクリアする (マップからも削除し、配列もクリア)
     */
    function clearMapMarkers() { //
        stationMarkers.forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
        stationMarkers = [];
    }

    /**
     * 道の駅の緯度・経度情報に基づいてマーカーを生成し、stationMarkers配列に格納する
     * （実際にマップに追加するかは toggleStationMarkers が制御）
     * @param {Array<Object>} stations - 道の駅オブジェクトの配列
     */
    function addMarkersToMap(stations) { //
        clearMapMarkers(); // まず既存のマーカーをマップから削除し、配列をクリア

        if (stations.length === 0) {
            map.setView([36.2048, 138.2529], 6);
            updateToggleStationMarkersButtonUI(); // データがないのでボタンを無効化
            return;
        }

        const newMarkers = [];
        stations.forEach((station, index) => {
            if (!isNaN(station.latitude) && !isNaN(station.longitude)) {
                let marker;
                if (station.visitDate && station.visitDate !== '') {
                    marker = L.marker([station.latitude, station.longitude], { icon: redCircleIcon });
                } else {
                    marker = L.marker([station.latitude, station.longitude]);
                }
                let popupContent = `<b>${station.name}</b><br>${station.address}<br>電話: ${station.phone}`;
                if (station.url && station.url !== '') {
                    const displayUrl = station.url.startsWith('http') ? station.url : `http://${station.url}`;
                    popupContent += `<br><a href="${displayUrl}" target="_blank" rel="noopener noreferrer">サイトを見る</a>`;
                }
                if (station.memo && station.memo !== '') {
                    popupContent += `<br>メモ: ${station.memo.replace(/\n/g, '<br>')}`;
                }

                marker.bindPopup(popupContent);
                
                marker.on('click', () => {
                    if (editingStationIndex !== null) {
                        alert('編集中のデータがあります。先に保存またはキャンセルしてください。');
                        return;
                    }

                    const stationLatLng = L.latLng(station.latitude, station.longitude);

                    if (currentMapClickMode === 'setStart') {
                        setStartPoint(stationLatLng, station.name);
                        currentMapClickMode = 'none';
                        updateMapModeButtonsUI();
                        showTab('routeCreationTabContent');
                    } else if (currentMapClickMode === 'setEnd') {
                        setEndPoint(stationLatLng, station.name);
                        currentMapClickMode = 'none';
                        updateMapModeButtonsUI();
                        showTab('routeCreationTabContent');
                    } else if (currentMapClickMode === 'setWaypoint') {
                        handleMapClickForIntermediate(stationLatLng, station.name, true);
                    } else {
                        stationDropdown.value = index;
                        showTab('stationInfoTabContent');
                        showStationDetails(index);
                    }
                });

                newMarkers.push(marker);
            }
        });
        stationMarkers = newMarkers; // 新しいマーカー配列をセット

        // 現在の表示状態に基づいてマーカーをマップに追加/削除
        toggleStationMarkers(stationMarkersVisible);
        updateRoutePointMarkers(); // ルートマーカーも最新状態に

        if (stationMarkers.length > 0) {
            const group = new L.featureGroup(stationMarkers);
            map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
        updateToggleStationMarkersButtonUI(); // ボタンの状態を更新
    }

    /**
     * マップクリックモードボタンのUIを更新する
     */
    function updateMapModeButtonsUI() {
        setStartModeButton.classList.remove('active');
        setEndModeButton.classList.remove('active');
        setWaypointModeButton.classList.remove('active'); 

        if (currentMapClickMode === 'setStart') {
            setStartModeButton.classList.add('active');
            setStartModeButton.textContent = '出発地点に設定 (ON)';
        } else {
            setStartModeButton.textContent = '出発地点に設定';
        }

        if (currentMapClickMode === 'setEnd') {
            setEndModeButton.classList.add('active');
            setEndModeButton.textContent = '終了地点に設定 (ON)';
        } else {
            setEndModeButton.textContent = '終了地点に設定';
        }

        if (currentMapClickMode === 'setWaypoint') { 
            setWaypointModeButton.classList.add('active');
            setWaypointModeButton.textContent = '経由地として地図で選択 (ON)';
        } else {
            setWaypointModeButton.textContent = '経由地として地図で選択';
        }
    }

    /**
     * 出発地点を設定する (地図クリックまたは道の駅クリックで使用)
     * @param {L.LatLng} latLng - 設定する緯度経度
     * @param {string} name - 地点名
     */
    function setStartPoint(latLng, name) {
        // 同じ地点が既に設定されている場合、何もしない
        if (startPoint && startPoint.latLng.equals(latLng)) {
            return;
        }

        // 既存の出発地点をクリアする前に、それが既存の中継地点/経由地でないことを確認
        if (startPoint) {
             const indexInIntermediate = intermediateWaypoints.findIndex(wp => wp.latLng.equals(startPoint.latLng));
             if (indexInIntermediate === -1) { // 既存の中継地点/経由地でない場合のみマーカーを削除
                if (startPoint.marker) map.removeLayer(startPoint.marker);
             }
        }
        startPoint = { latLng, name };

        // 選択された地点が既に終了地点になっている場合、終了地点をクリアする
        if (endPoint && endPoint.latLng.equals(latLng)) {
            clearEndPoint();
        }
        // 選択された地点が既に中継地点/経由地になっている場合、それらを削除する
        intermediateWaypoints = intermediateWaypoints.filter(wp => !wp.latLng.equals(latLng));
        
        updateMapRoute(); // ルートを更新
        updateRouteButtonsState(); // ボタンの状態を更新
        updateRoutePointMarkers(); // ルート地点マーカーを更新
        updateIntermediateWaypointsListUI(); // 中継地点/経由地リストを更新
    }

    /**
     * 終了地点を設定する (地図クリックまたは道の駅クリックで使用)
     * @param {L.LatLng} latLng - 設定する緯度経度
     * @param {string} name - 地点名
     */
    function setEndPoint(latLng, name) {
        // 同じ地点が既に設定されている場合、何もしない
        if (endPoint && endPoint.latLng.equals(latLng)) {
            return;
        }

        // 既存の終了地点をクリアする前に、それが既存の中継地点/経由地でないことを確認
        if (endPoint) {
            const indexInIntermediate = intermediateWaypoints.findIndex(wp => wp.latLng.equals(endPoint.latLng));
            if (indexInIntermediate === -1) { // 既存の中継地点/経由地でない場合のみマーカーを削除
               if (endPoint.marker) map.removeLayer(endPoint.marker);
            }
        }
        endPoint = { latLng, name };

        // 選択された地点が既に出発地点になっている場合、出発地点をクリアする
        if (startPoint && startPoint.latLng.equals(latLng)) {
            clearStartPoint();
        }
        // された地点が既に中継地点/経由地になっている場合、それらを削除する
        intermediateWaypoints = intermediateWaypoints.filter(wp => !wp.latLng.equals(latLng));

        updateMapRoute(); // ルートを更新
        updateRouteButtonsState(); // ボタンの状態を更新
        updateRoutePointMarkers(); // ルート地点マーカーを更新
        updateIntermediateWaypointsListUI(); // 中継地点/経由地リストを更新
    }

    /**
     * 中継地点または経由地を追加する
     * @param {L.LatLng} latLng - 追加する緯度経度
     * @param {string} name - 地点名
     * @param {boolean} hasStayTime - 滞在時間計算に含めるかどうか
     */
    function addIntermediateWaypoint(latLng, name, hasStayTime) {
        // この関数が呼ばれる前に重複チェック済みのはずだが、念のため
        if ((startPoint && startPoint.latLng.equals(latLng)) ||
            (endPoint && endPoint.latLng.equals(latLng)) ||
            (intermediateWaypoints.some(wp => wp.latLng.equals(latLng)))) {
            alert('この地点は既に出発/終了/中継地点/経由地として設定されています。');
            return;
        }

        const newWaypoint = { latLng, name, hasStayTime };
        intermediateWaypoints.push(newWaypoint);
        
        updateMapRoute();
        updateRouteButtonsState();
        updateRoutePointMarkers();
        updateIntermediateWaypointsListUI(); // 中継地点/経由地リストを更新
    }

    /**
     * 地図クリック（道の駅マーカークリック含む）で中継地点/経由地を追加・削除する処理
     * @param {L.LatLng} latLng - クリックされた緯度経度
     * @param {string} name - 地点名
     * @param {boolean} isStation - 道の駅からのクリックか（trueならhasStayTime: true）
     */
    function handleMapClickForIntermediate(latLng, name, isStation) {
        // クリックされた地点が既に出発地点または終了地点の場合、操作を中断
        if ((startPoint && startPoint.latLng.equals(latLng)) || (endPoint && endPoint.latLng.equals(latLng))) {
            alert('この地点は既に出発地点または終了地点として設定されています。先にクリアしてください。');
            return;
        }

        const existingWaypointIndex = intermediateWaypoints.findIndex(wp => wp.latLng.equals(latLng));

        if (existingWaypointIndex !== -1) {
            // 既に中継地点/経由地として存在する場合、削除する
            removeRoutePointByLatLng(latLng);
            alert(`${name} を経由地/中継地点から削除しました。`);
        } else {
            // 存在しない場合、新しく追加する
            addIntermediateWaypoint(latLng, name, isStation);
            alert(`${name} を経由地/中継地点に追加しました。`);
        }
        showTab('routeCreationTabContent'); // ルート作成タブがアクティブのままになるように
    }


    /**
     * 指定された緯度経度に一致するルート上の地点を削除する汎用関数
     * @param {L.LatLng} latLngToRemove - 削除する地点の緯度経度
     */
    function removeRoutePointByLatLng(latLngToRemove) {
        let removed = false;

        // 出発地点の削除
        if (startPoint && startPoint.latLng.equals(latLngToRemove)) {
            clearStartPoint();
            removed = true;
        }
        // 終了地点の削除
        if (endPoint && endPoint.latLng.equals(latLngToRemove)) {
            clearEndPoint();
            removed = true;
        }

        // 中継地点/経由地の削除
        const initialLength = intermediateWaypoints.length;
        intermediateWaypoints = intermediateWaypoints.filter(wp => {
            if (wp.latLng.equals(latLngToRemove)) {
                if (wp.marker) map.removeLayer(wp.marker);
                return false; // 削除対象
            }
            return true; // 残す
        });
        if (intermediateWaypoints.length < initialLength) {
            removed = true;
        }

        if (removed) {
            updateMapRoute();
            updateRoutePointMarkers();
            updateRouteButtonsState();
            updateIntermediateWaypointsListUI(); // 中継地点/経由地リストを更新
            // 現在選択中の道の駅があれば、その詳細表示を更新してボタンの状態を反映させる
            if (currentSelectedStationIndex !== null) {
                showStationDetails(currentSelectedStationIndex);
            }
        }
    }


    /**
     * 出発地点をクリアするヘルパー関数
     */
    function clearStartPoint() {
        if (startPoint && startPoint.marker) {
            map.removeLayer(startPoint.marker);
        }
        startPoint = null;
    }

    /**
     * 終了地点をクリアするヘルパー関数
     */
    function clearEndPoint() {
        if (endPoint && endPoint.marker) {
            map.removeLayer(endPoint.marker);
        }
        endPoint = null;
    }

    /**
     * 全ての中継地点/経由地をクリアするヘルパー関数
     */
    function clearIntermediateWaypoints() {
        intermediateWaypoints.forEach(wp => {
            if (wp.marker) {
                map.removeLayer(wp.marker);
            }
        });
        intermediateWaypoints = [];
    }


    /**
     * 現在のルートをクリアする
     */
    function clearRoute() {
        clearStartPoint();
        clearEndPoint();
        clearIntermediateWaypoints();

        routeTotalDistance = 0;
        routeCalculatedTravelTimeMinutes = 0;
        routeTotalStayTimeMinutes = 0;
        routeTotalElapsedTimeMinutes = 0;
        currentMapClickMode = 'none'; // マップモードをリセット
        updateMapModeButtonsUI();     // マップモードボタンのUIを更新

        // ルート地点のカスタムマーカーもクリア
        routePointMarkers.forEach(marker => map.removeLayer(marker));
        routePointMarkers = [];

        if (routingControl) {
            map.removeControl(routingControl);
            initRoutingControl(); // ウェイポイントをクリアするために再初期化
        }

        // ルートがクリアされたら、道の駅マーカーを再表示する (CSVが読み込まれていれば)
        if (allStationsData.length > 0) {
            toggleStationMarkers(true);
        }

        updateRouteButtonsState();
        updateRouteListWindow();
        updateIntermediateWaypointsListUI(); // 中継地点/経由地リストを更新

        // 現在選択中の道の駅があれば、その詳細表示を更新してボタンの状態を反映させる
        if (currentSelectedStationIndex !== null) {
            showStationDetails(currentSelectedStationIndex);
        }
        alert('ルートがクリアされました。');
    }

    /**
     * 地図上のルート表示を更新する
     */
    function updateMapRoute() {
        if (!routingControl) {
            initRoutingControl();
        }

        const waypoints = [];
        if (startPoint) {
            waypoints.push(startPoint.latLng);
        }
        // 中継地点/経由地はソートされないまま追加される
        intermediateWaypoints.forEach(wp => waypoints.push(wp.latLng));
        if (endPoint) {
            waypoints.push(endPoint.latLng);
        }

        if (waypoints.length >= 2) { // 出発地点と終了地点が両方あればルートを計算
            routingControl.setWaypoints(waypoints);
            if (!map.hasLayer(routingControl)) {
                routingControl.addTo(map);
            }
        } else {
            // ルートに必要なウェイポイントがない場合、ルートをマップから削除
            if (map.hasLayer(routingControl)) {
                map.removeControl(routingControl);
                initRoutingControl(); // 完全にクリアするために再初期化
            }
            routeTotalDistance = 0; // ルートがないので距離も0
            calculateRouteTimes(); // 距離が0になったので時間も再計算
        }
    }

    /**
     * ルート上の地点マーカーを更新・描画する
     */
    function updateRoutePointMarkers() {
        // 既存のルート地点マーカーを全てクリア
        routePointMarkers.forEach(marker => map.removeLayer(marker));
        routePointMarkers = [];

        // 新しいマーカーを追加
        if (startPoint) {
            const marker = L.marker(startPoint.latLng, { icon: startIcon }).addTo(map)
                .bindPopup(`<b>出発地点:</b> ${startPoint.name}<br>緯度: ${startPoint.latLng.lat.toFixed(4)}<br>経度: ${startPoint.latLng.lng.toFixed(4)}`);
            marker.on('click', (e) => removeRoutePointByLatLng(e.latlng)); // クリックで削除
            routePointMarkers.push(marker);
            startPoint.marker = marker; // 参照を保存
        }
        intermediateWaypoints.forEach((wp, index) => {
            // hasStayTime に応じてアイコンを切り替える (変更点)
            const icon = wp.hasStayTime ? intermediateIcon : viaPointIcon;
            const marker = L.marker(wp.latLng, { icon: icon }).addTo(map)
                .bindPopup(`<b>${wp.hasStayTime ? '中継地点' : '経由地'} ${index + 1}:</b> ${wp.name}<br>緯度: ${wp.latLng.lat.toFixed(4)}<br>経度: ${wp.latLng.lng.toFixed(4)}`);
            marker.on('click', (e) => removeRoutePointByLatLng(e.latlng)); // クリックで削除
            routePointMarkers.push(marker);
            wp.marker = marker; // 参照を保存
        });
        if (endPoint) {
            const marker = L.marker(endPoint.latLng, { icon: endIcon }).addTo(map)
                .bindPopup(`<b>終了地点:</b> ${endPoint.name}<br>緯度: ${endPoint.latLng.lat.toFixed(4)}<br>経度: ${endPoint.latLng.lng.toFixed(4)}`);
            marker.on('click', (e) => removeRoutePointByLatLng(e.latlng)); // クリックで削除
            routePointMarkers.push(marker);
            endPoint.marker = marker; // 参照を保存
        }
    }

    /**
     * 中継地点/経由地のリストUIを更新する
     */
    function updateIntermediateWaypointsListUI() {
        intermediateWaypointsList.innerHTML = ''; // リストをクリア

        if (intermediateWaypoints.length === 0) {
            const li = document.createElement('li');
            li.classList.add('placeholder-item');
            li.textContent = '現在、中継地点/経由地はありません。';
            intermediateWaypointsList.appendChild(li);
            return;
        }

        intermediateWaypoints.forEach((wp, index) => {
            const li = document.createElement('li');
            const pointType = wp.hasStayTime ? '中継地点' : '経由地';
            li.innerHTML = `<span>${pointType} ${index + 1}: ${wp.name}</span>`;
            
            const removeButton = document.createElement('button');
            removeButton.textContent = '削除';
            removeButton.classList.add('remove-waypoint-button');
            removeButton.dataset.lat = wp.latLng.lat; // 削除対象を特定するために緯度経度をデータ属性に保存
            removeButton.dataset.lng = wp.latLng.lng;
            removeButton.addEventListener('click', (event) => {
                const lat = parseFloat(event.target.dataset.lat);
                const lng = parseFloat(event.target.dataset.lng);
                removeRoutePointByLatLng(L.latLng(lat, lng));
            });
            li.appendChild(removeButton);
            intermediateWaypointsList.appendChild(li);
        });
    }


    /**
     * ルートの総走行時間、総滞在時間、総経過時間を計算する
     */
    function calculateRouteTimes() {
        // 設定値の更新
        averageSpeedKmH = parseFloat(averageSpeedInput.value);
        defaultStayTimeMinutes = parseFloat(defaultStayTimeInput.value);

        // 総滞在時間は hasStayTime が true の中継地点の数のみに基づいて計算 (スタートとゴールは含めない)
        const pointsWithStayTime = intermediateWaypoints.filter(wp => wp.hasStayTime);
        const totalStayPoints = pointsWithStayTime.length;

        if (startPoint !== null && endPoint !== null && routeTotalDistance > 0 && averageSpeedKmH > 0) {
            const distanceKm = routeTotalDistance / 1000;
            const travelTimeHours = distanceKm / averageSpeedKmH;
            routeCalculatedTravelTimeMinutes = travelTimeHours * 60;

            routeTotalStayTimeMinutes = defaultStayTimeMinutes * totalStayPoints;

            // 総経過時間 = 総走行時間 + 総滞在時間
            routeTotalElapsedTimeMinutes = routeCalculatedTravelTimeMinutes + routeTotalStayTimeMinutes;
        } else {
            routeCalculatedTravelTimeMinutes = 0;
            routeTotalStayTimeMinutes = 0;
            routeTotalElapsedTimeMinutes = 0;
        }
        // ルート一覧ウィンドウが開いていれば更新
        updateRouteListWindow();
    }


    /**
     * ルート関連ボタン (クリア、一覧表示、印刷、ルートCSV読込/保存) とマップモードボタンの有効/無効状態を更新する
     */
    function updateRouteButtonsState() {
        const hasFullRoute = startPoint !== null && endPoint !== null;
        const hasAnyRoutePoint = startPoint !== null || endPoint !== null || intermediateWaypoints.length > 0;
        const isCsvLoaded = allStationsData.length > 0;
        const isRouteCsvSelected = routeCsvFileInput.files.length > 0; 
        const isEditing = editingStationIndex !== null; // 編集中かどうかのフラグ

        // ルート作成タブのコントロール
        loadRouteCsvButton.disabled = !isRouteCsvSelected || isEditing; 
        clearRouteButton.disabled = !hasAnyRoutePoint || isEditing; 
        showRouteListButton.disabled = !hasFullRoute || isEditing;  
        printRouteListButton.disabled = !hasFullRoute || isEditing; 
        saveRouteCsvButton.disabled = !hasFullRoute || isEditing; 
        
        // CSVが読み込まれていない、かつルート地点が全くない場合は無効化
        setStartModeButton.disabled = (!isCsvLoaded && !hasAnyRoutePoint) || isEditing;
        setEndModeButton.disabled = (!isCsvLoaded && !hasAnyRoutePoint) || isEditing;
        setWaypointModeButton.disabled = (!isCsvLoaded && !hasAnyRoutePoint) || isEditing;

        // 解除ボタンの状態更新 (追加)
        clearStartPointButton.disabled = startPoint === null || isEditing;
        clearEndPointButton.disabled = endPoint === null || isEditing;
        clearIntermediateWaypointsButton.disabled = intermediateWaypoints.length === 0 || isEditing;

        // 選択中の道の駅を中継地点として追加ボタンの有効/無効
        let canAddSelectedAsIntermediate = false;
        if (currentSelectedStationIndex !== null && allStationsData[currentSelectedStationIndex]) {
            const station = allStationsData[currentSelectedStationIndex];
            const stationLatLng = L.latLng(station.latitude, station.longitude);
            const isCurrentStationStartPoint = startPoint && startPoint.latLng.equals(stationLatLng);
            const isCurrentStationEndPoint = endPoint && endPoint.latLng.equals(stationLatLng);
            const isCurrentStationIntermediate = intermediateWaypoints.some(wp => wp.latLng.equals(stationLatLng));
            canAddSelectedAsIntermediate = !isCurrentStationStartPoint && !isCurrentStationEndPoint && !isCurrentStationIntermediate;
        }
        addSelectedStationAsWaypointButton.disabled = !canAddSelectedAsIntermediate || isEditing;


        // 走行時速と滞在時間入力フィールドも同様に制御
        averageSpeedInput.disabled = isEditing; 
        defaultStayTimeInput.disabled = isEditing; 

        // 道の駅情報タブのコントロール
        csvFileInput.disabled = isEditing;
        saveCsvButton.disabled = !isCsvLoaded || isEditing;
        stationDropdown.disabled = !isCsvLoaded || isEditing;
        
        // 道の駅マーカー表示/非表示ボタンの状態も更新
        toggleStationMarkersButton.disabled = !isCsvLoaded || isEditing;

        // 取扱説明書ボタンは編集モード中以外は常に有効
        showManualButton.disabled = isEditing;

        // 編集モード中はタブボタンを無効化し、切り替えられないようにする
        stationInfoTabButton.disabled = isEditing;
        routeCreationTabButton.disabled = isEditing;
    }


    /**
     * 道の駅の編集モードに入る
     * @param {number} index - 編集する道の駅のインデックス
     */
    function enterEditMode(index) {
        if (editingStationIndex !== null && editingStationIndex !== index) {
            alert('他の道の駅が編集中です。先に保存またはキャンセルしてください。');
            return;
        }
        if (editingStationIndex === index) {
            return; // 既に編集中であれば何もしない
        }

        editingStationIndex = index;
        stationDetailsDisplay.classList.add('editing-display');

        const station = allStationsData[index];
        let editHtml = `
            <p><strong>訪問日:</strong> <input type="text" id="editVisitDate" value="${station.visitDate === '' ? DEFAULT_VISIT_DATE : station.visitDate}" data-original-value="${station.visitDate}"></p>
            <p><strong>名称:</strong> <input type="text" id="editName" value="${station.name}" data-original-value="${station.name}"></p>
            <p><strong>電話:</strong> <input type="text" id="editPhone" value="${station.phone}" data-original-value="${station.phone}"></p>
            <p><strong>住所:</strong> <input type="text" id="editAddress" value="${station.address}" data-original-value="${station.address}"></p>
            <p><strong>緯度:</strong> <input type="text" id="editLatitude" value="${station.latitude}" data-original-value="${station.latitude}"></p>
            <p><strong>経度:</strong> <input type="text" id="editLongitude" value="${station.longitude}" data-original-value="${station.longitude}"></p>
            <p><strong>URL:</strong> <input type="text" id="editUrl" value="${station.url}" data-original-value="${station.url}"></p>
            <p><strong>メモ:</strong> <textarea id="editMemo" data-original-value="${station.memo}">${station.memo}</textarea></p> <!-- 追加: メモ入力欄 -->
        `;
        stationDetailsDisplay.innerHTML = editHtml;

        actionButtonsForDetails.innerHTML = '';
        const saveButton = document.createElement('button');
        saveButton.textContent = '保存';
        saveButton.classList.add('save-btn');
        saveButton.addEventListener('click', () => {
            saveEditedStation(index);
        });
        actionButtonsForDetails.appendChild(saveButton);

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'キャンセル';
        cancelButton.classList.add('cancel-btn');
        cancelButton.addEventListener('click', () => {
            cancelEdit(index);
        });
        actionButtonsForDetails.appendChild(cancelButton);

        // 編集モード中は、他の操作を無効化
        updateRouteButtonsState(); // これにより多くのコントロールやタブボタンが無効化される
        currentMapClickMode = 'none'; // 編集中はマップモードを解除
        updateMapModeButtonsUI();
    }

    /**
     * 編集した道の駅のデータを保存する
     * @param {number} index - 編集中の道の駅のインデックス
     */
    function saveEditedStation(index) {
        const newStationData = { ...allStationsData[index] }; // 現在のデータで新しいオブジェクトを作成

        const editVisitDate = document.getElementById('editVisitDate');
        const editName = document.getElementById('editName');
        const editPhone = document.getElementById('editPhone');
        const editAddress = document.getElementById('editAddress');
        const editLatitude = document.getElementById('editLatitude');
        const editLongitude = document.getElementById('editLongitude');
        const editUrl = document.getElementById('editUrl');
        const editMemo = document.getElementById('editMemo'); // 追加: メモ入力欄の参照

        let hasError = false;

        newStationData.visitDate = editVisitDate.value.trim();
        newStationData.name = editName.value.trim();
        newStationData.phone = editPhone.value.trim();
        newStationData.address = editAddress.value.trim();
        newStationData.url = editUrl.value.trim();
        newStationData.memo = editMemo.value.trim(); // 追加: メモの保存

        const lat = parseFloat(editLatitude.value.trim());
        const lon = parseFloat(editLongitude.value.trim());

        if (isNaN(lat) || !isFinite(lat)) {
            editLatitude.style.borderColor = 'red';
            alert('緯度は有効な数値を入力してください。');
            hasError = true;
        } else {
            newStationData.latitude = lat;
            editLatitude.style.borderColor = '';
        }

        if (isNaN(lon) || !isFinite(lon)) {
            editLongitude.style.borderColor = 'red';
            alert('経度は有効な数値を入力してください。');
            hasError = true;
        } else {
            newStationData.longitude = lon;
            editLongitude.style.borderColor = '';
        }

        if (hasError) {
            return; // エラーがあれば保存処理を中断
        }

        const originalLatLng = L.latLng(allStationsData[index].latitude, allStationsData[index].longitude); // 編集前の緯度経度
        const editedLatLng = L.latLng(newStationData.latitude, newStationData.longitude); // 編集後の緯度経度
        allStationsData[index] = newStationData; // まずデータを更新

        // 編集された道の駅が出発地点、終了地点、または中継地点/経由地の場合、ルートとマーカーも更新
        if (startPoint && startPoint.latLng.equals(originalLatLng)) { 
            startPoint.name = newStationData.name;
            startPoint.latLng = editedLatLng;
        }
        if (endPoint && endPoint.latLng.equals(originalLatLng)) { 
            endPoint.name = newStationData.name;
            endPoint.latLng = editedLatLng;
        }
        intermediateWaypoints.forEach(wp => {
            if (wp.latLng.equals(originalLatLng)) { 
                wp.name = newStationData.name;
                wp.latLng = editedLatLng;
            }
        });
        
        updateMapRoute(); // マップ上のルートを再計算・更新
        updateRoutePointMarkers(); // ルート地点のマーカーを更新
        updateIntermediateWaypointsListUI(); // 中継地点/経由地リストを更新


        populateStationDropdown(allStationsData); // ドロップダウンメニューを再描画
        stationDropdown.value = index; // 現在の選択を維持
        showStationDetails(index); // 詳細表示を更新
        addMarkersToMap(allStationsData); // 道の駅マーカーを再描画（訪問日による色変更などを反映）
        updateAchievementRate(); // 達成率を更新

        editingStationIndex = null; // 編集モードを終了

        updateRouteButtonsState(); // ボタンやタブの状態を復元
        updateMapModeButtonsUI();
    }

    /**
     * 道の駅の編集をキャンセルする
     * @param {number} index - キャンセルする道の駅のインデックス
     */
    function cancelEdit(index) {
        // 元のデータを復元（今回は簡易的に詳細表示を再描画することで元の状態に戻す）
        showStationDetails(index);
        if (stationMarkers[index]) {
            stationMarkers[index].closePopup();
        }
        updateAchievementRate();

        editingStationIndex = null; // 編集モードを終了

        updateRouteButtonsState(); // ボタンやタブの状態を復元
        updateMapModeButtonsUI();
    }

    /**
     * 現在の道の駅データをCSV形式の文字列に変換する
     * @param {Array<Object>} stations - 道の駅オブジェクトの配列
     * @returns {string} CSV形式の文字列
     */
    function generateCSV(stations) {
        const header = "訪問日,名称,電話番号,住所,緯度,経度,URL,メモ"; // 修正: ヘッダーにメモを追加
        const rows = stations.map(station => {
            const escapeField = (field) => {
                let value = String(field);
                // フィールド内にカンマ、改行、二重引用符が含まれる場合はエスケープ処理を行う
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    value = '"' + value.replace(/"/g, '""') + '"'; // 二重引用符で囲み、内部の二重引用符は二重化
                }
                return value;
            };

            return [
                escapeField(station.visitDate),
                escapeField(station.name),
                escapeField(station.phone),
                escapeField(station.address),
                escapeField(station.latitude),
                escapeField(station.longitude),
                escapeField(station.url),
                escapeField(station.memo) // 追加: メモを出力
            ].join(',');
        });
        return [header, ...rows].join('\n');
    }

    /**
     * CSVファイルをダウンロードさせる
     * @param {Array<Object>} stations - ダウンロードする道の駅データ
     */
    function saveCSVFile(stations) {
        const csvString = generateCSV(stations);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'michinoeki_edited.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * 達成率を計算し、表示を更新する
     * 訪問日が空でない道の駅を訪問済みとしてカウントする
     */
    function updateAchievementRate() {
        const totalStations = allStationsData.length;
        let visitedStations = 0;

        allStationsData.forEach(station => {
            if (station.visitDate && station.visitDate !== '') {
                visitedStations++;
            }
        });

        let achievementPercentage = 0;
        if (totalStations > 0) {
            achievementPercentage = Math.round((visitedStations / totalStations) * 100);
        }

        achievementRateSpan.textContent = `(${visitedStations}/${totalStations}) 達成率${achievementPercentage}%`;
    }

    /**
     * 分を「X時間 Y分」形式にフォーマットするヘルパー関数
     * @param {number} totalMinutes - 総分数
     * @returns {string} フォーマットされた文字列
     */
    function formatMinutesToHoursMinutes(totalMinutes) {
        if (totalMinutes < 1) return '0分'; // 1分未満は0分と表示
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.round(totalMinutes % 60); // 端数を四捨五入

        let parts = [];
        if (hours > 0) parts.push(`${hours}時間`);
        if (minutes > 0 || hours === 0) parts.push(`${minutes}分`); // 時間が0でも分があれば表示
        return parts.join(' ');
    }

    /**
     * ルート一覧を新しいウィンドウで開く
     */
    function openRouteListWindow() {
        if (startPoint === null || endPoint === null) {
            alert('出発地点と終了地点の両方を設定してください。');
            return;
        }

        if (routeListWindow && !routeListWindow.closed) {
            routeListWindow.focus(); // 既に開いている場合はフォーカス
        } else {
            routeListWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes');
            if (routeListWindow) {
                routeListWindow.document.write(`
                    <!DOCTYPE html>
                    <html lang="ja">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>道の駅 ルート一覧</title>
                        <style>
                            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f4f7f6; color: #333; }
                            h1 { color: #2c3e50; font-size: 1.8em; margin-bottom: 20px; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.08); border-radius: 8px; overflow: hidden; }
                            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                            th { background-color: #e8f5e9; color: #2e7d32; font-weight: bold; }
                            tr:nth-child(even) { background-color: #f9f9f9; }
                            tr:hover { background-color: #f0f0f0; }
                            .controls-new-window { text-align: right; margin-bottom: 15px; }
                            .controls-new-window button {
                                padding: 8px 15px;
                                border: 1px solid #28a745;
                                border-radius: 4px; /* 固定のborder-radius */
                                background-color: #28a745;
                                color: white;
                                cursor: pointer;
                                font-size: 1em;
                                transition: background-color 0.2s;
                            }
                            .controls-new-window button:hover {
                                background-color: #218838;
                                border-color: #218838;
                            }
                            .summary-table { width: auto; margin-left: auto; margin-right: 0; margin-top: 20px; }
                            .summary-table td:first-child { font-weight: bold; padding-right: 15px; }
                            @media print {
                                .controls-new-window { display: none; } /* 印刷時にコントロールを非表示 */
                            }
                        </style>
                    </head>
                    <body>
                        <h1>道の駅 ルート一覧</h1>
                        <div id="routeListContent">
                            <p>出発地点と終了地点を設定するとルートが表示されます。</p>
                        </div>
                    </body>
                    </html>
                `);
                routeListWindow.document.close();
                routeListWindow.addEventListener('beforeunload', () => {
                    routeListWindow = null; // ウィンドウが閉じられたら参照をクリア
                });
            } else {
                alert('ポップアップウィンドウが開けませんでした。ブラウザの設定を確認してください。');
                return;
            }
        }
        updateRouteListWindow(); // ウィンドウの内容を更新
    }

    /**
     * ルート一覧ウィンドウの内容を更新する
     */
    function updateRouteListWindow() {
        if (routeListWindow && !routeListWindow.closed) {
            const contentDiv = routeListWindow.document.getElementById('routeListContent');
            if (contentDiv) {
                if (startPoint === null || endPoint === null) {
                    contentDiv.innerHTML = '<p>出発地点と終了地点を設定するとルートが表示されます。</p>';
                } else {
                    const totalDistanceKm = (routeTotalDistance / 1000).toFixed(1);

                    let htmlContent = `
                        <table>
                            <thead>
                                <tr>
                                    <th>区分</th>
                                    <th>道の駅名/地点名</th>
                                    <th>電話番号</th> <!-- 電話番号列を追加 -->
                                    <th>緯度</th>
                                    <th>経度</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    let currentOrder = 1;

                    // ヘルパー関数: 地点情報から電話番号を取得
                    const getPhoneNumber = (point) => {
                        // 地図上の任意地点の場合、電話番号は無い
                        if (point.name.startsWith('地図上の')) {
                            return 'N/A';
                        }
                        // 道の駅データから電話番号を検索
                        const station = allStationsData.find(s => 
                            s.name === point.name && 
                            Math.abs(s.latitude - point.latLng.lat) < 0.0001 && // 浮動小数点数の比較
                            Math.abs(s.longitude - point.latLng.lng) < 0.0001
                        );
                        return station ? station.phone : 'N/A';
                    };

                    if (startPoint) {
                        htmlContent += `
                            <tr>
                                <td>出発地点 (${currentOrder})</td>
                                <td>${startPoint.name}</td>
                                <td>${getPhoneNumber(startPoint)}</td> <!-- 電話番号を追加 -->
                                <td>${startPoint.latLng.lat.toFixed(4)}</td>
                                <td>${startPoint.latLng.lng.toFixed(4)}</td>
                            </tr>
                        `;
                        currentOrder++;
                    }
                    intermediateWaypoints.forEach((wp, index) => {
                        htmlContent += `
                            <tr>
                                <td>${wp.hasStayTime ? '中継地点' : '経由地'} (${currentOrder + index})</td>
                                <td>${wp.name}</td>
                                <td>${getPhoneNumber(wp)}</td> <!-- 電話番号を追加 -->
                                <td>${wp.latLng.lat.toFixed(4)}</td>
                                <td>${wp.latLng.lng.toFixed(4)}</td>
                            </tr>
                        `;
                    });
                    if (endPoint) {
                        htmlContent += `
                            <tr>
                                <td>終了地点 (${currentOrder + intermediateWaypoints.length})</td>
                                <td>${endPoint.name}</td>
                                <td>${getPhoneNumber(endPoint)}</td> <!-- 電話番号を追加 -->
                                <td>${endPoint.latLng.lat.toFixed(4)}</td>
                                <td>${endPoint.latLng.lng.toFixed(4)}</td>
                            </tr>
                        `;
                    }
                    htmlContent += `
                            </tbody>
                        </table>
                        <table class="summary-table">
                            <tr><td>設定した走行時速:</td><td> ${averageSpeedKmH} km/h</td></tr>
                            <tr><td>設定した地点ごとの滞在時間:</td><td> ${defaultStayTimeMinutes} 分</td></tr>
                            <tr><td>ルート総移動距離:</td><td> ${totalDistanceKm} km</td></tr>
                            <tr><td>総走行時間:</td><td> ${formatMinutesToHoursMinutes(routeCalculatedTravelTimeMinutes)}</td></tr>
                            <tr><td>総滞在時間 (中継地点のみ):</td><td> ${formatMinutesToHoursMinutes(routeTotalStayTimeMinutes)}</td></tr>
                            <tr><td>総経過時間:</td><td> ${formatMinutesToHoursMinutes(routeTotalElapsedTimeMinutes)}</td></tr>
                        </table>
                    `;
                    contentDiv.innerHTML = htmlContent;
                }
            }
        }
    }

    /**
     * ルート一覧を印刷する 
     */
    function printRouteList() {
        if (routeListWindow && !routeListWindow.closed) {
            routeListWindow.focus();
            routeListWindow.print();
        } else {
            alert('まずルート一覧を表示してください。');
        }
    }


    /**
     * 現在のルートデータをCSV形式の文字列に変換する
     * @returns {string} CSV形式の文字列
     */
    function generateRouteCSV() {
        // ヘッダーに電話番号と滞在時間考慮フラグを追加
        const header = "区分,道の駅名/地点名,電話番号,緯度,経度,滞在時間考慮"; 
        const rows = [];
        let currentOrder = 1;

        // ヘルパー関数: 地点情報から電話番号を取得
        const getPhoneNumberForCSV = (point) => {
            if (point.name.startsWith('地図上の')) {
                return ''; // 地図上の任意地点の場合、CSVでは空欄
            }
            const station = allStationsData.find(s => 
                s.name === point.name && 
                Math.abs(s.latitude - point.latLng.lat) < 0.0001 && 
                Math.abs(s.longitude - point.latLng.lng) < 0.0001
            );
            return station ? station.phone : ''; // 見つからなければ空欄
        };

        if (startPoint !== null) {
            const phoneNumber = getPhoneNumberForCSV(startPoint);
            // 出発地点、終了地点は滞在時間考慮フラグをN/Aとする
            rows.push(`出発地点 (${currentOrder}),"${startPoint.name}","${phoneNumber}",${startPoint.latLng.lat.toFixed(4)},${startPoint.latLng.lng.toFixed(4)},N/A`);
            currentOrder++;
        }
        intermediateWaypoints.forEach((wp, index) => {
            const phoneNumber = getPhoneNumberForCSV(wp);
            const typeString = wp.hasStayTime ? '中継地点' : '経由地';
            const stayTimeConsidered = wp.hasStayTime ? 'true' : 'false';
            rows.push(`${typeString} (${currentOrder + index}),"${wp.name}","${phoneNumber}",${wp.latLng.lat.toFixed(4)},${wp.latLng.lng.toFixed(4)},${stayTimeConsidered}`);
        });
        if (endPoint !== null) {
            const phoneNumber = getPhoneNumberForCSV(endPoint);
             rows.push(`終了地点 (${currentOrder + intermediateWaypoints.length}),"${endPoint.name}","${phoneNumber}",${endPoint.latLng.lat.toFixed(4)},${endPoint.latLng.lng.toFixed(4)},N/A`);
        }
        
        const totalDistanceKm = (routeTotalDistance / 1000).toFixed(1);
        const travelTimeFormatted = formatMinutesToHoursMinutes(routeCalculatedTravelTimeMinutes);
        const stayTimeFormatted = formatMinutesToHoursMinutes(routeTotalStayTimeMinutes);
        const elapsedTimeFormatted = formatMinutesToHoursMinutes(routeTotalElapsedTimeMinutes);

        let csvString = [header, ...rows].join('\n');
        csvString += `\n\nルート情報:\n`;
        csvString += `設定した走行時速(km/h),${averageSpeedKmH}\n`;
        csvString += `設定した地点ごとの滞在時間(分),${defaultStayTimeMinutes}\n`;
        csvString += `ルート総移動距離(km),${totalDistanceKm}\n`;
        csvString += `総走行時間,${travelTimeFormatted}\n`;
        // 出発/終了地点が未設定の場合は、総滞在時間と総経過時間は含めないか、適切な値を表示
        if (startPoint !== null && endPoint !== null) { // フルルートが設定されている場合のみ表示
            csvString += `総滞在時間 (中継地点のみ),${stayTimeFormatted}\n`; 
            csvString += `総経過時間,${elapsedTimeFormatted}\n`;
        } else {
            // ルートが不完全な場合はN/Aとする
            csvString += `総滞在時間 (中継地点のみ),N/A\n`;
            csvString += `総経過時間,N/A\n`;
        }


        return csvString;
    }

    /**
     * ルートCSVファイルをダウンロードさせる
     * @param {string} csvString - ダウンロードするCSV文字列
     */
    function saveRouteCSVFile(csvString) {
        // メインウィンドウのコンテキストでBlobを生成・ダウンロード
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'michinoeki_route.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * ルートCSVファイルを読み込む 
     */
    function loadRouteCsvFile() {
        const file = routeCsvFileInput.files[0];
        if (!file) {
            alert('ルートCSVファイルを選択してください。');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const csvText = e.target.result;
            try {
                toggleStationMarkers(false); // ルートCSV読み込み時は道の駅マーカーを非表示にする
                parseRouteCsvContent(csvText);
                alert('ルートCSVを読み込みました。');
                // ルートが読み込まれたら、地図の表示をフィットさせる
                fitMapToBoundsOfRoutePoints();
                updateRouteButtonsState();
                updateMapModeButtonsUI();
            } catch (error) {
                console.error('Error parsing route CSV:', error);
                alert(`ルートCSVファイルの解析に失敗しました: ${error.message}`);
                clearRoute(); // エラー時はルートをクリア
                toggleStationMarkers(true); // エラー発生時は道の駅マーカーを再表示
            }
        };
        reader.onerror = () => {
            console.error('Error reading route file:', reader.error);
            alert('ルートCSVファイルの読み込みに失敗しました。');
            clearRoute(); // エラー時はルートをクリア
            toggleStationMarkers(true); // エラー発生時は道の駅マーカーを再表示
        };
        reader.readAsText(file, 'UTF-8');
    }

    /**
     * ルートCSVコンテンツを解析し、ルートデータをセットする 
     * @param {string} csvContent - ルートCSVの内容
     */
    function parseRouteCsvContent(csvContent) {
        clearRoute(); // 既存のルートを一度クリア

        const lines = csvContent.trim().split('\n');
        let inRouteInfoSection = false;
        
        for (const line of lines) {
            if (line.trim() === '') { // 空行をスキップ
                continue;
            }
            if (line.startsWith('ルート情報:')) {
                inRouteInfoSection = true;
                continue;
            }

            if (!inRouteInfoSection) {
                // ヘッダー行をスキップ
                // ヘッダーの電話番号列、滞在時間考慮フラグ列追加に対応
                if (line.startsWith('区分,') && line.includes('道の駅名/地点名') && (line.includes('電話番号,緯度,経度,滞在時間考慮') || line.includes('緯度,経度'))) {
                    continue;
                }

                const parts = parseCsvLine(line);
                
                // 電話番号列と滞在時間考慮フラグ列の有無でパースロジックを調整
                let type, name, lat, lng, hasStayTime = false;

                if (parts.length === 6) { // 区分,道の駅名/地点名,電話番号,緯度,経度,滞在時間考慮 の場合 (最新フォーマット)
                    type = parts[0].split('(')[0].trim();
                    name = parts[1].trim();
                    // parts[2] は電話番号だが、ここでは使用しない
                    lat = parseFloat(parts[3]);
                    lng = parseFloat(parts[4]);
                    hasStayTime = (parts[5].trim().toLowerCase() === 'true');
                } else if (parts.length === 5) { // 区分,道の駅名/地点名,電話番号,緯度,経度 の場合 (以前のフォーマット)
                    type = parts[0].split('(')[0].trim();
                    name = parts[1].trim();
                    // parts[2] は電話番号
                    lat = parseFloat(parts[3]);
                    lng = parseFloat(parts[4]);
                    // 以前のフォーマットではhasStayTimeは常にtrueと仮定（中継地点のみだったため）
                    hasStayTime = (type === '中継地点'); 
                } else if (parts.length === 4) { // 区分,道の駅名/地点名,緯度,経度 (さらに古いフォーマット)
                    type = parts[0].split('(')[0].trim();
                    name = parts[1].trim();
                    lat = parseFloat(parts[2]);
                    lng = parseFloat(parts[3]);
                    hasStayTime = (type === '中継地点'); // 以前のフォーマットではhasStayTimeは常にtrueと仮定
                } else {
                    console.warn(`Skipping malformed route point line (unexpected column count): ${line}`);
                    continue;
                }

                if (isNaN(lat) || isNaN(lng)) {
                    console.warn(`Skipping invalid route point line (coords): ${line}`);
                    continue;
                }

                const latLng = L.latLng(lat, lng);
                const pointData = { latLng, name, hasStayTime }; 

                if (type === '出発地点') {
                    startPoint = pointData;
                } else if (type === '終了地点') {
                    endPoint = pointData;
                } else if (type === '中継地点' || type === '経由地') { // 中継地点と経由地の両方を中間地点として扱う
                    intermediateWaypoints.push(pointData);
                }
            } else { // ルート情報セクションのパース
                const matchSpeed = line.match(/^設定した走行時速\(km\/h\),(.+)$/); 
                if (matchSpeed) {
                    const speed = parseFloat(matchSpeed[1].trim());
                    if (!isNaN(speed) && speed > 0) {
                        averageSpeedInput.value = speed;
                        averageSpeedKmH = speed;
                    }
                }
                const matchStay = line.match(/^設定した地点ごとの滞在時間\(分\),(.+)$/); 
                if (matchStay) {
                    const stayTime = parseFloat(matchStay[1].trim());
                    if (!isNaN(stayTime) && stayTime >= 0) {
                        defaultStayTimeInput.value = stayTime;
                        defaultStayTimeMinutes = stayTime;
                    }
                }
            }
        }

        // 読み込み後の最終チェックと警告
        if (startPoint === null || endPoint === null) {
            if (intermediateWaypoints.length > 0) {
                alert('警告: ルートCSVには出発地点または終了地点が正しく記述されていません。中継地点/経由地のみが読み込まれました。');
            } else {
                 alert('警告: ルートCSVには出発地点と終了地点が正しく記述されていません。ルートは不完全です。');
            }
        }
        updateMapRoute(); 
        updateRoutePointMarkers(); 
        updateIntermediateWaypointsListUI(); // 中継地点/経由地リストを更新
        calculateRouteTimes(); 
    }

    /**
     * CSVの1行をパースして配列として返す (クォートに対応)
     * @param {string} line - CSVの1行
     * @returns {string[]} パースされたフィールドの配列
     */
    function parseCsvLine(line) {
        const result = [];
        let inQuote = false;
        let currentField = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuote && i + 1 < line.length && line[i + 1] === '"') { // 二重引用符 (エスケープされた引用符)
                    currentField += '"';
                    i++; // 次の引用符も消費
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                result.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        result.push(currentField); // 最後のフィールドを追加
        return result;
    }


    /**
     * 現在のルート上の全地点を含むように地図の表示範囲を調整する 
     */
    function fitMapToBoundsOfRoutePoints() {
        const allRouteLatLngs = [];
        if (startPoint) allRouteLatLngs.push(startPoint.latLng);
        intermediateWaypoints.forEach(wp => allRouteLatLngs.push(wp.latLng));
        if (endPoint) allRouteLatLngs.push(endPoint.latLng);

        if (allRouteLatLngs.length > 0) {
            // L.latLngBoundsを使って範囲を計算し、map.fitBoundsで調整
            const bounds = L.latLngBounds(allRouteLatLngs);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }


    /**
     * 取扱説明書を新しいウィンドウで表示する 
     */
    function showManual() {
        if (manualWindow && !manualWindow.closed) {
            manualWindow.focus(); // 既に開いている場合はフォーカス
        } else {
            manualWindow = window.open('', '_blank', 'width=800,height=700,scrollbars=yes');
            if (manualWindow) {
                let manualContent = '';
                manualContent += '<!DOCTYPE html>';
                manualContent += '<html lang="ja">';
                manualContent += '<head>';
                manualContent += '    <meta charset="UTF-8">';
                manualContent += '    <meta name="viewport" content="width=device-width, initial-scale=1.0">';
                manualContent += '    <title>道の駅Webスタンプ帳 - 取扱説明書</title>';
                manualContent += '    <style>';
                manualContent += '        body { font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; line-height: 1.6; color: #333; background-color: #f8f8f8; }';
                manualContent += '        h1 { color: #2c3e50; font-size: 2em; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }';
                manualContent += '        h2 { color: #34495e; font-size: 1.5em; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; }';
                manualContent += '        h3 { color: #555; font-size: 1.2em; margin-top: 20px; margin-bottom: 10px; }';
                manualContent += '        ul { list-style-type: disc; margin-left: 20px; }';
                manualContent += '        ol { list-style-type: decimal; margin-left: 20px; }';
                manualContent += '        li { margin-bottom: 5px; }';
                manualContent += '        .note { background-color: #e8f5e9; border-left: 5px solid #4CAF50; padding: 10px 15px; margin: 15px 0; border-radius: 4px; }';
                manualContent += '        .warning { background-color: #fff3e0; border-left: 5px solid #ff9800; padding: 10px 15px; margin: 15px 0; border-radius: 4px; }';
                manualContent += '        code { background-color: #e0e0e0; padding: 2px 4px; border-radius: 3px; font-family: monospace; }';
                manualContent += '    </style>';
                manualContent += '</head>';
                manualContent += '<body>';
                manualContent += '    <h1>道の駅Webスタンプ帳 Ver1.50 - 取扱説明書</h1>'; // バージョン表記を更新
                manualContent += '    <div class="note">';
                manualContent += '        このWebスタンプ帳は、日本の道の駅巡りを記録し、ルート計画を支援するためのツールです。<br>';
                manualContent += '        CSVファイルの読み込みと保存、地図上での道の駅表示、ルート作成、およびルート情報の出力が可能です。';
                manualContent += '    </div>';
                manualContent += '    <h2>1. 基本操作</h2>';
                manualContent += '    <ol>';
                manualContent += '        <li><strong>道の駅CSVを選択 / 編集内容をCSVで保存:</strong>';
                manualContent += '            <ul>';
                manualContent += '                <li>「道の駅情報」タブの「道の駅CSVを選択」ボタンから、道の駅データを含むCSVファイル（カンマ区切りテキストファイル）を読み込みます。ファイルのフォーマットは後述「4.1. 道の駅CSVフォーマット」を参照してください。</li>';
                manualContent += '                <li>読み込まれた道の駅は、「道の駅情報」タブの「道の駅を選択」プルダウンメニューに表示されます。選択すると、その道の駅の詳細情報が下に表示され、地図上でもその地点にフォーカスが当たります。</li>';
                manualContent += '                <li>道の駅情報を編集（訪問日など）した後、「編集内容をCSVで保存」ボタンで変更内容をCSVファイルとしてダウンロードできます。</li>';
                manualContent += '                <li>「道の駅情報」タブの「**道の駅マーカーを非表示**」ボタンで、地図上の道の駅マーカーの表示/非表示を切り替えられます。非表示状態でも、道の駅を選択するとその道の駅のマーカーのみが表示されます。</li>'; // 追記
                manualContent += '            </ul>';
                manualContent += '        </li>';
                manualContent += '        <li><strong>達成率:</strong> 「道の駅情報」タブに表示され、読み込んだ全道の駅のうち、訪問日が入力されている道の駅の割合が表示されます。</li>';
                manualContent += '    </ol>';
                manualContent += '    <h2>2. 道の駅情報の編集</h2>';
                manualContent += '    <p>「道の駅情報」タブの道の駅詳細表示の下にある「編集」ボタンをクリックすると、入力フィールドが表示され、以下の項目を編集できます。</p>';
                manualContent += '    <ul>';
                manualContent += '        <li><strong>訪問日:</strong> YYYY-MM-DD形式。未訪問の場合は空欄。</li>';
                manualContent += '        <li><strong>名称、電話、住所、緯度、経度、URL:</strong> それぞれの情報を編集します。緯度と経度は数値である必要があります。</li>';
                manualContent += '        <li><strong>メモ:</strong> 道の駅に関する自由なメモを記述できます。</li>'; // 追加
                manualContent += '    </ul>';
                manualContent += '    <p>編集後、「保存」で変更を確定し、「キャンセル」で変更を破棄します。</p>';
                manualContent += '    <h2>3. ルート作成機能</h2>';
                manualContent += '    <p>「ルート作成」タブに切り替えて、出発地点、中継地点（複数可）、終了地点を設定してルートを作成できます。</p>';
                manualContent += '    <div class="note">'; // ルートCSV読込時の注意点追加
                manualContent += '        <strong>注意:</strong> ルートCSVを読み込むと、道の駅マーカーは自動的に非表示になります。道の駅マーカーを再表示するには、「ルートをクリア」するか、「道の駅情報」タブで「道の駅マーカーを表示」ボタンをクリックしてください。';
                manualContent += '    </div>';
                manualContent += '    <h3>3.1. 地点の設定</h3>';
                manualContent += '    <ol>';
                manualContent += '        <li><strong>地図クリックで地点を設定:</strong>';
                manualContent += '            <ul>';
                manualContent += '                <li>「ルート作成」タブの「**出発地点に設定**」または「**終了地点に設定**」ボタンをクリックします。ボタンが黄色くハイライトされたら、地図上の任意の場所、または道の駅のマーカーをクリックして地点を設定します。</li>';
                manualContent += '                <li>「**経由地として地図で選択**」ボタンをクリックします。ボタンが黄色くハイライトされたら、地図上の任意の場所をクリックして経由地を追加します。道の駅のマーカーをクリックすることもできます。複数の経由地を追加できます。</li>';
                manualContent += '                <li>設定された地点は地図上に専用のマーカーで表示され、自動的にルートが計算されます。<br>';
                manualContent += '                    **マーカーの色**: 出発地点(緑)、終了地点(赤)。中継地点(青 - 滞在時間考慮)、経由地(紫 - 滞在時間なし)。</li>'; // 追記
                manualContent += '                <li>**設定済みの地点マーカーを再度クリックすると、その地点をルートから削除できます。**</li>';
                manualContent += '            </ul>';
                manualContent += '        </li>';
                manualContent += '        <li><strong>地点の解除:</strong>';
                manualContent += '            <ul>';
                manualContent += '                <li>「出発地点に設定」の横にある「**解除**」ボタンをクリックすると、出発地点をルートからクリアできます。</li>'; // 追記
                manualContent += '                <li>「終了地点に設定」の横にある「**解除**」ボタンをクリックすると、終了地点をルートからクリアできます。</li>'; // 追記
                manualContent += '                <li>「経由地として地図で選択」の横にある「**全解除**」ボタンをクリックすると、すべての中継地点および経由地をルートからクリアできます。</li>'; // 追記
                manualContent += '                <li>「現在の中継地点/経由地」リストの各地点の横にある「**削除**」ボタンをクリックすることで、個別の地点をルートから解除することも可能です。</li>';
                manualContent += '            </ul>';
                manualContent += '        </li>';
                manualContent += '        <li><strong>道の駅を選択して中継地点として追加:</strong>';
                manualContent += '            <ul>';
                manualContent += '                <li>まず「道の駅情報」タブで道の駅を選択します。</li>';
                manualContent += '                <li>次に「ルート作成」タブに切り替え、「**選択中の道の駅を中継地点に追加**」ボタンをクリックして、選択中の道の駅をルートの中継地点として設定します。</li>';
                manualContent += '            </ul>';
                manualContent += '        </li>';
                manualContent += '        <li class="note"><strong>中継地点と経由地の違い:</strong><br>';
                manualContent += '            「選択中の道の駅を中継地点に追加」で追加された道の駅は**中継地点**（青色マーカー）として扱われ、走行時間の計算時に設定された「滞在時間」が考慮されます。<br>';
                manualContent += '            「経由地として地図で選択」で地図クリックにより追加された地点は**経由地**（紫色マーカー）として扱われ、滞在時間は考慮されず、走行時間のみが計算されます。'; // 追記
                manualContent += '        </li>';
                manualContent += '    </ol>';
                manualContent += '    <h3>3.2. ルート関連の設定と表示</h3>';
                manualContent += '    <ol>';
                manualContent += '        <li><strong>走行時速(km/h):</strong> 自動車での平均走行時速を入力します。この値に基づいて走行時間が計算されます。</li>';
                manualContent += '        <li><strong>滞在時間(分/中継点):</strong> 各中継地点（hasStayTimeがtrueの地点）での平均滞在時間（分）を入力します。<strong>出発地点、終了地点、および経由地は滞在時間計算には含まれません。</strong></li>';
                manualContent += '        <li><strong>ルートをクリア:</strong> 設定した出発地点、中継地点、経由地、終了地点、および地図上のルート表示を全てクリアします。道の駅CSVが読み込まれていれば、道の駅マーカーは再表示されます。</li>'; // 追記
                manualContent += '        <li><strong>ルート一覧を表示 (別ウィンドウ):</strong> 設定したルートの出発地点、中継地点、経由地、終了地点のリストと、計算された総走行時間、総滞在時間、総経過時間を新しいウィンドウで表示します。</li>';
                manualContent += '        <li><strong>ルート一覧を印刷:</strong> 「ルート一覧を表示」で開いたウィンドウの内容を印刷します。</li>';
                manualContent += '        <li><strong>ルートCSVを読込 / ルートを読込:</strong> 以前に保存したルートCSVファイル（<code>michinoeki_route.csv</code>など）を読み込み、「ルートを読込」ボタンで地図にルートを再表示し、設定を復元します。この際、道の駅マーカーは非表示になります。</li>'; // 追記
                manualContent += '        <li><strong>ルートをCSVで保存:</strong> 現在設定されているルート情報をCSVファイルとしてダウンロードできます。このCSVは「ルートCSVを読込」で再利用可能です。</li>';
                manualContent += '    </ol>';
                manualContent += '    <h2>4. CSVファイルフォーマット</h2>';
                manualContent += '    <h3>4.1. 道の駅CSVフォーマット</h3>';
                manualContent += '    <p>以下の8つの項目をカンマ区切りで記述してください。1行目はヘッダー行として扱われます。</p>'; // 修正: 項目数変更
                manualContent += '    <pre><code>訪問日,名称,電話番号,住所,緯度,経度,URL,メモ</code></pre>'; // 修正: ヘッダーにメモを追加
                manualContent += '    <ul>';
                manualContent += '        <li><strong>訪問日:</strong> YYYY-MM-DD形式。未訪問の場合は空欄。</li>';
                manualContent += '        <li><strong>名称:</strong> 道の駅の名称。</li>';
                manualContent += '        <li><strong>電話番号:</strong> 電話番号。</li>';
                manualContent += '        <li><strong>住所:</strong> 住所。</li>';
                manualContent += '        <li><strong>緯度:</strong> 緯度（数値）。</li>';
                manualContent += '        <li><strong>経度:</strong> 経度（数値）。</li>';
                manualContent += '        <li><strong>URL:</strong> 公式サイトなどのURL。</li>';
                manualContent += '        <li><strong>メモ:</strong> 道の駅に関する自由なメモ。改行やカンマを含む場合は二重引用符で囲んでください。</li>'; // 追加
                manualContent += '    </ul>';
                manualContent += '    <p class="warning">';
                manualContent += '        <strong>注意:</strong> フィールド内にカンマ (<code>,</code>) や改行 (<code>\\n</code>)、二重引用符 (<code>"</code>) が含まれる場合は、そのフィールド全体を二重引用符で囲み、二重引用符自体は二重にエスケープ (<code>""</code>) してください。';
                manualContent += '    </p>';
                manualContent += '    <h3>4.2. ルートCSVフォーマット</h3>';
                manualContent += '    <p>「ルートをCSVで保存」で出力されるCSVのフォーマットは、大きく2つのセクションに分かれています。</p>';
                manualContent += '    <pre><code>区分,道の駅名/地点名,電話番号,緯度,経度,滞在時間考慮\\n出発地点 (1),"道の駅○○","0123-45-6789",35.xxxx,139.yyyy,N/A\\n中継地点 (2),"道の駅△△","0987-65-4321",36.xxxx,138.yyyy,true\\n経由地 (3),"地図上の経由地 (Lat: 37.aaaa, Lng: 137.bbbb)","",37.aaaa,137.bbbb,false\\n終了地点 (4),"地図上の終了地点 (Lat: 38.cccc, Lng: 136.dddd)","",38.cccc,136.dddd,N/A\\n\\nルート情報:\\n設定した走行時速(km/h),40\\n設定した地点ごとの滞在時間(分),30\\nルート総移動距離(km),123.4\\n総走行時間,3時間5分\\n総滞在時間 (中継地点のみ),1時間30分\\n総経過時間,4時間35分</code></pre>'; // CSVフォーマット例を更新
                manualContent += '    <ul>';
                manualContent += '        <li><strong>地点情報セクション:</strong> 各地点の区分、名前、**電話番号**、緯度、経度、**滞在時間考慮フラグ**が記述されます。出発/終了地点の滞在時間考慮フラグは「N/A」となります。<br>区分が「中継地点」の場合は滞在時間が考慮され、「経由地」の場合は考慮されません。</li>';
                manualContent += '        <li><strong>ルート情報セクション:</strong> <code>ルート情報:</code> の行以降に、設定した走行時速、滞在時間、計算された総距離や時間が記述されます。このセクションは、ルートCSV読込時に設定値の復元に使用されます。</li>';
                manualContent += '    </ul>';
                manualContent += '    <h2>5. その他の注意事項</h2>';
                manualContent += '    <ul>';
                manualContent += '        <li>地図データの表示にはOpenStreetMap、ルーティングにはOSRMのデモサーバーを利用しています。OSRMデモサーバーは本番環境での利用には適していません。</li>';
                manualContent += '        <li>ブラウザのポップアップブロック設定によっては、ルート一覧や取扱説明書が新しいウィンドウで開かない場合があります。その際はブラウザの設定をご確認ください。</li>';
                manualContent += '    </ul>';
                manualContent += '    <hr>';
                manualContent += '    <p style="text-align: center; font-size: 0.8em; color: #777;">道の駅Webスタンプ帳 Ver1.50</p>'; // バージョン表記を更新
                manualContent += '</body>';
                manualContent += '</html>';

                manualWindow.document.write(manualContent);
                manualWindow.document.close();
                manualWindow.addEventListener('beforeunload', () => {
                    manualWindow = null; // ウィンドウが閉じられたら参照をクリア
                });
            } else {
                alert('ポップアップウィンドウが開けませんでした。ブラウザの設定を確認してください。');
            }
        }
    }


    // --- 初期化処理 ---
    updateAchievementRate();
    updateRouteButtonsState();
    updateMapModeButtonsUI(); 
    updateIntermediateWaypointsListUI(); // 初回ロード時にリストも初期化
    updateToggleStationMarkersButtonUI(); // 初期ロード時にボタンの状態を更新
    // ページロード時にデフォルトで「道の駅情報」タブを表示
    showTab('stationInfoTabContent');
});