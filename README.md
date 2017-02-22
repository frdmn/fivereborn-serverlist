# fivereborn-serverlist

Simple NodeJS application to query the (dpmaster based) *FiveReborn* / *FiveM* / *project Ʌ* (or whatever it's called now) master server for a list of available game server using UDP.

## Installation 

1. Make sure you've installed all requirements
2. Clone this repository:

    ```
    git clone https://github.com/frdmn/fivereborn-serverlist
    ```

3. Install the dependencies using `npm`:

    ```
    npm install
    ```

## Usage

Here's a short explanation how to use `fivereborn-serverlist`:

* Run `index.js`:

    ```
    node index.js
    ```

## Example output

```json
{
    "success": true,
    "timestamp": "2017-02-22T07:50:20.981Z",
    "runtime": 20338,
    "data": {
       "144.217.69.165:30120": {
            "success": true,
            "responsetime": 99,
            "data": {
                "sv_maxclients": "24",
                "clients": "20",
                "challenge": "r4nd0m",
                "gamename": "GTA5",
                "protocol": "4",
                "hostname": "^4State of Emergency Realistic Roleplay | Persistent Characters | Economy | Jobs | Houses | ^2[EvolPCGaming.com]",
                "gametype": "SoE-RP",
                "mapname": "",
                "iv": "-1841258791"
            }
        },
        "51.254.238.200:50928": {
            "success": false,
            "responsetime": 200,
            "data": {
                "error": "Timeout of 200 exceeded."
            }
        },
        "198.204.228.154:30129": {
            "success": true,
            "responsetime": 114,
            "data": {
                "sv_maxclients": "24",
                "clients": "1",
                "challenge": "r4nd0m",
                "gamename": "GTA5",
                "protocol": "4",
                "hostname": "YoshiYoutube",
                "gametype": "Freeroam",
                "mapname": "fivem-map-skater",
                "iv": "-467332163"
            }
        }
    }
}
```

## Contributing

1. Fork it
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## Requirements / Dependencies

* Node

## Version

1.0.0

## License

[MIT](LICENSE)
