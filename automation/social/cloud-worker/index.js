module.exports=(req,res)=>{res.statusCode=404;res.setHeader("X-Robots-Tag","noindex,nofollow");res.end("No public service");};
