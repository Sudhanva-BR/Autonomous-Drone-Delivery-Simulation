#include <bits/stdc++.h>
using namespace std;

using ll = long long;

struct State {
    ll time;
    int r, c;
    ll battery;
    ll altitude;  // Current flying altitude (never decreases)
};

struct Cmp {
    bool operator()(const State &a, const State &b) const {
        return a.time > b.time; // min-heap
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int N, M;
    ll B, K;
    if (!(cin >> N >> M >> B >> K)) {
        return 0;
    }

    vector<vector<ll>> height(N, vector<ll>(M));
    for (int i = 0; i < N; i++) {
        for (int j = 0; j < M; j++) {
            cin >> height[i][j];
        }
    }

    int S;
    cin >> S;
    set<pair<int,int>> recharge;
    for (int i = 0; i < S; i++) {
        int r, c;
        cin >> r >> c;
        recharge.insert({r - 1, c - 1});
    }

    const ll INF = LLONG_MAX / 4;

    // State: (row, col, battery, altitude)
    map<tuple<int,int,ll,ll>, ll> dist;
    map<tuple<int,int,ll,ll>, tuple<int,int,ll,ll>> parent;

    priority_queue<State, vector<State>, Cmp> pq;

    // Start at altitude = height of starting building
    ll startAlt = height[0][0];
    pq.push({startAlt, 0, 0, B, startAlt});
    dist[make_tuple(0, 0, B, startAlt)] = startAlt;

    vector<pair<int,int>> dirs = {
        {0,1},{0,-1},{1,0},{-1,0}
    };

    ll bestTime = INF;
    tuple<int,int,ll,ll> bestState;

    while (!pq.empty()) {
        State cur = pq.top();
        pq.pop();

        auto key = make_tuple(cur.r, cur.c, cur.battery, cur.altitude);
        if (dist.count(key) && dist[key] < cur.time) continue;

        if (cur.r == N-1 && cur.c == M-1) {
            if (cur.time < bestTime) {
                bestTime = cur.time;
                bestState = key;
            }
            continue;
        }

        for (const auto& d : dirs) {
            int dr = d.first;
            int dc = d.second;

            int nr = cur.r + dr;
            int nc = cur.c + dc;
            if (nr < 0 || nr >= N || nc < 0 || nc >= M) continue;

            ll nt = cur.time + 1;      // Base time: 1 second per move
            ll nb = cur.battery - 1;    // Base battery: 1 per move
            ll newAlt = cur.altitude;   // Maintain current altitude

            // Only climb if next building is TALLER than current altitude
            if (height[nr][nc] > cur.altitude) {
                ll climb = height[nr][nc] - cur.altitude;
                nt += climb;           // Extra time for climbing
                nb -= climb;           // Extra battery for climbing
                newAlt = height[nr][nc];  // Update to new maximum altitude
            }
            // If next building is shorter or equal, just fly over it at current altitude
            // No extra time or battery needed!

            if (nb < 0) continue;

            // Recharge if at a charging station
            if (recharge.count({nr, nc})) {
                nb = min(B, nb + K);
            }

            auto nkey = make_tuple(nr, nc, nb, newAlt);
            if (!dist.count(nkey) || dist[nkey] > nt) {
                dist[nkey] = nt;
                parent[nkey] = key;
                pq.push({nt, nr, nc, nb, newAlt});
            }
        }
    }

    if (bestTime == INF) {
        cout << "-1\n";
        return 0;
    }

    // Reconstruct path
    vector<tuple<int,int,ll,ll,ll>> path;
    auto cur = bestState;
    while (true) {
        ll t = dist[cur];
        path.push_back(make_tuple(get<0>(cur), get<1>(cur), get<2>(cur), get<3>(cur), t));
        if (get<0>(cur) == 0 && get<1>(cur) == 0) break;
        cur = parent[cur];
    }
    reverse(path.begin(), path.end());

    // output JSON
    cout << "{\n";
    cout << "  \"time\": " << bestTime << ",\n";
    cout << "  \"path\": [\n";
    for (size_t i = 0; i < path.size(); i++) {
        int r = get<0>(path[i]);
        int c = get<1>(path[i]);
        ll b = get<2>(path[i]);
        ll alt = get<3>(path[i]);
        ll t = get<4>(path[i]);
        
        cout << "    {\"row\":" << r
             << ",\"col\":" << c
             << ",\"battery\":" << b
             << ",\"altitude\":" << alt
             << ",\"time\":" << t << "}";
        if (i + 1 < path.size()) cout << ",";
        cout << "\n";
    }
    cout << "  ]\n";
    cout << "}\n";

    return 0;
}