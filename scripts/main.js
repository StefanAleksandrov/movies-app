const UserModel = firebase.auth();
const url = "https://movies-app-2020.firebaseio.com/movies.json";


const router = Sammy("#container", function () {
    this.use("Handlebars", "hbs");

    this.get("/", function (ctx) {
        const userData = checkLoggedIn();
        ctx.movies = [];

        if (userData) {
            ctx.loggedIn = true;
            ctx.email = userData.email;
        }

        fetch(url)
            .then(resp => resp.json())
            .then(data => {

                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        data[key].id = key;
                        ctx.movies.push(data[key]);
                    }
                }

                this.loadPartials({
                    "header": "./templates/partials/header.hbs",
                    "movie": "./templates/partials/movie.hbs",
                    "footer": "./templates/partials/footer.hbs",
                })
                    .then(function () {
                        this.partial("./templates/home.hbs")
                    })
            });
    });

    this.get("/login", function (ctx) {
        this.loadPartials({
            "header": "./templates/partials/header.hbs",
            "footer": "./templates/partials/footer.hbs",
        })
            .then(function () {
                this.partial("./templates/login.hbs")
            })
    });

    this.get("/register", function (ctx) {
        this.loadPartials({
            "header": "./templates/partials/header.hbs",
            "footer": "./templates/partials/footer.hbs",
        })
            .then(function () {
                this.partial("./templates/register.hbs")
            })
    });

    this.get("/logout", function (ctx) {
        const { email } = JSON.parse(localStorage.getItem("userInfo"));
        infoMsgDisplay(`Successful logout`);
        localStorage.removeItem("userInfo");
        setTimeout(() => {
            ctx.redirect("/");
        }, 500);
    });

    this.get("/addmovie", function (ctx) {
        const userData = checkLoggedIn();

        if (userData) {
            ctx.loggedIn = true;
            ctx.email = userData.email;
        }

        this.loadPartials({
            "header": "./templates/partials/header.hbs",
            "footer": "./templates/partials/footer.hbs",
        })
            .then(function () {
                this.partial("./templates/addMovie.hbs");
            });
    });

    this.get("/details/:id", function (ctx) {
        const userData = checkLoggedIn();
        const { id } = ctx.params;
        const urlMovie = `https://movies-app-2020.firebaseio.com/movies/${id}.json`;


        if (userData) {
            ctx.loggedIn = true;
            ctx.email = userData.email;
        }

        fetch(urlMovie)
            .then(resp => resp.json())
            .then(data => {
                const { title, imageUrl, description, likesCount, creator } = data;
                ctx.title = title;
                ctx.imageUrl = imageUrl;
                ctx.description = description;
                ctx.likesCount = likesCount.length - 1;
                ctx.liked = Boolean(likesCount.includes(userData.uid));
                ctx.id = id;
                ctx.isCreator = Boolean(creator == userData.uid);

                this.loadPartials({
                    "header": "./templates/partials/header.hbs",
                    "footer": "./templates/partials/footer.hbs",
                })
                    .then(function () {
                        this.partial("../templates/details.hbs");
                    });
            })
            .catch(err => errorMsgDisplay(err.message))
    });

    this.get("/delete/:id", function (ctx) {
        const { id } = ctx.params;
        let deleteUrl = `https://movies-app-2020.firebaseio.com/movies/${id}.json`

        UserModel.currentUser.getIdToken(false)
            .then(idToken => {
                fetch(deleteUrl + `?auth=${idToken}`, {
                    method: "DELETE"
                })
                    .then(resp => {
                        if (resp.status >= 200 && resp.status < 300) {
                            infoMsgDisplay("Success!");
                            ctx.redirect("/");
                        } else {
                            errorMsgDisplay(`Error code ${resp.status}`);
                        }
                    })
                    .catch(err => errorMsgDisplay(err.message));
            })
    });

    this.get("/edit/:id", function (ctx) {
        const userData = checkLoggedIn();
        const { id } = ctx.params;
        let editUrl = `https://movies-app-2020.firebaseio.com/movies/${id}.json`;

        if (userData) {
            ctx.loggedIn = true;
            ctx.email = userData.email;
        }

        fetch(editUrl)
            .then(resp => resp.json())
            .then(data => {
                ctx.title = data.title;
                ctx.description = data.description;
                ctx.imageUrl = data.imageUrl;
                ctx.id = id;

                this.loadPartials({
                    "header": "./templates/partials/header.hbs",
                    "footer": "./templates/partials/footer.hbs",
                })
                    .then(function () {
                        this.partial("../templates/editMovie.hbs")
                    });
            })
            .catch(err => errorMsgDisplay(err.message))
    });

    this.get("/like/:id", function (ctx) {
        const { id } = ctx.params;
        const { uid, email } = checkLoggedIn()

        let urlLike = `https://movies-app-2020.firebaseio.com/movies/${id}.json`;

        fetch(urlLike)
            .then(resp => resp.json())
            .then(data => {
                let index = data.likesCount.length;
                data.likesCount[index] = uid;

                UserModel.currentUser.getIdToken(false)
                    .then(idToken => {
                        fetch(urlLike + `?auth=${idToken}`, {
                            method: "PUT",
                            body: JSON.stringify(data),
                        })
                            .then(resp => {
                                infoMsgDisplay(resp);
                                ctx.redirect(`/details/${id}`);
                            })
                            .catch(err => errorMsgDisplay(err.message));
                    })
            })
            .catch(err => errorMsgDisplay(err.message));
    });

    this.get("/unlike/:id", function (ctx) {
        const { id } = ctx.params;
        const { uid, email } = checkLoggedIn()
        let urlUnlike = `https://movies-app-2020.firebaseio.com/movies/${id}.json`;

        fetch(urlUnlike)
            .then(resp => resp.json())
            .then(data => {
                let index = data.likesCount.indexOf(uid);
                data.likesCount.splice(index, 1);

                UserModel.currentUser.getIdToken(false)
                    .then(idToken => {
                        fetch(urlUnlike + `?auth=${idToken}`, {
                            method: "PUT",
                            body: JSON.stringify(data),
                        })
                            .then(resp => {
                                infoMsgDisplay(resp);
                                ctx.redirect(`/details/${id}`);
                            })
                            .catch(err => errorMsgDisplay(err.message));
                    })
            })
            .catch(err => errorMsgDisplay(err.message));
    })

    this.post("/register", function (ctx) {
        const { email, password, repeatPassword } = ctx.params;
        const emailRegex = /\w+@(\w+.)+.\w+/;

        if (!emailRegex.test(email)) {
            errorMsgDisplay(`${email} is not a valid email`);
            return;
        }

        if (password !== repeatPassword) {
            errorMsgDisplay("Passwords should match!");
            return;
        }

        if (password.length < 6) {
            errorMsgDisplay("Password should be 6 or more symbols");
            return;
        }

        UserModel.createUserWithEmailAndPassword(email, password)
            .then(resp => {
                infoMsgDisplay("Successful registration");

                setTimeout(() => {
                    ctx.redirect("/login");
                }, 500);
            })
    });

    this.post("/login", function (ctx) {
        const { email, password } = ctx.params;

        if (email.length > 0 && password.length > 5) {
            UserModel.signInWithEmailAndPassword(email, password)
                .then(resp => {
                    const { email, uid } = resp.user;
                    let user = { email, uid };
                    localStorage.setItem("userInfo", JSON.stringify(user));
                    infoMsgDisplay(`Login successful.`);

                    setTimeout(() => {
                        ctx.redirect("/");
                    }, 500);
                })
                .catch(err => errorMsgDisplay(err.message));
        }
    });

    this.post("/addmovie", function (ctx) {
        const { title, description, imageUrl } = ctx.params;
        const { uid } = JSON.parse(localStorage.getItem("userInfo"));
        const movieObj = {
            title,
            description,
            imageUrl,
            creator: uid,
            likesCount: [0],
        }

        UserModel.currentUser.getIdToken(false)
            .then(idToken => {
                fetch(url + "?auth=" + idToken, {
                    method: "POST",
                    body: JSON.stringify(movieObj),
                })
                    .then(resp => {
                        if (resp.status >= 200 && resp.status < 300) {
                            ctx.redirect("/");
                        } else {
                            errorMsgDisplay(`Error code ${resp.status}`);
                        }
                    })
                    .catch(err => errorMsgDisplay(err.message));
            })
            .catch(err => errorMsgDisplay(err.message));
    });

    this.post("edit/:id", function (ctx) {
        const { id } = ctx.params;
        let urlMovie = `https://movies-app-2020.firebaseio.com/movies/${id}.json`;

        fetch(urlMovie)
            .then(resp => resp.json())
            .then(data => {
                const { title, description, imageUrl } = ctx.params;
                const editObj = {
                    title,
                    description,
                    imageUrl,
                }
                const obj = Object.assign(data, editObj);

                UserModel.currentUser.getIdToken(false)
                    .then(idToken => {
                        fetch(urlMovie + "?auth=" + idToken, {
                            method: "PUT",
                            body: JSON.stringify(obj),
                        })
                            .then(resp => {
                                ctx.redirect("/");
                            })
                            .catch(err => errorMsgDisplay(err.message));
                    })
            })
            .catch(err => errorMsgDisplay(err.message));
    })
});

router.run();

function errorMsgDisplay(message) {
    if (typeof message == "string") {
        const errElement = document.querySelector("#errorBox");
        errElement.innerText = message;
        errElement.parentElement.style.display = "block";

        setTimeout(() => {
            errElement.parentElement.style.display = "none";
        }, 2000);
    }
}

function infoMsgDisplay(message) {
    if (typeof message == "string") {
        const infoElement = document.querySelector("#successBox");
        infoElement.innerText = message;
        infoElement.parentElement.style.display = "block";

        setTimeout(() => {
            infoElement.parentElement.style.display = "none";
        }, 2000);
    }
}

function checkLoggedIn() {
    let userData = localStorage.getItem("userInfo");

    if (userData) {
        let { email, uid } = JSON.parse(userData);
        return { email, uid }
    } else {
        return null;
    }
}

function searchFilter(event) {
    let value = event.currentTarget.previousElementSibling.value.toLowerCase();
    const divElement = document.querySelector("div.row");
    const divElements = divElement.children;
    let elementsArr = Array.from(divElements);

    elementsArr.map(x => {
        if (x.children[0].children[1].children[0].innerText.toLowerCase().includes(value)) {
            x.classList.add("order-1");
            x.classList.remove("order-2");
            x.children[0].classList.remove("d-none");
        } else {
            x.classList.remove("order-1");
            x.classList.add("order-2");
            x.children[0].classList.add("d-none");
        }
    });
}